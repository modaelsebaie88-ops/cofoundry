-- =====================================================================
-- Networking: connections, recommendations, direct & group messaging
-- =====================================================================

create table public.connections (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  addressee_id  uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  message       text check (char_length(message) <= 500),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> addressee_id)
);
-- one connection row per unordered pair
create unique index connections_pair_uidx on public.connections
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index connections_addressee_idx on public.connections (addressee_id, status);
create index connections_requester_idx on public.connections (requester_id, status);

create or replace function public.are_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(a, b)
      and greatest(requester_id, addressee_id) = greatest(a, b)
  )
$$;

-- Requester may only create pending requests; only the addressee may accept/decline.
create or replace function public.guard_connection()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.responded_at := null;
  else
    if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
      raise exception 'Connection parties cannot change' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      if auth.uid() <> old.addressee_id then
        raise exception 'Only the recipient can respond to a connection request' using errcode = '42501';
      end if;
      new.responded_at := now();
    end if;
  end if;
  return new;
end $$;
create trigger connections_guard before insert or update on public.connections
  for each row execute function public.guard_connection();

-- ---------------------------------------------------------------------
-- Recommendations (snapshots written by the matching engine)
-- ---------------------------------------------------------------------
create table public.recommendations (
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  target_id    uuid not null references public.profiles (id) on delete cascade,
  score        int not null check (score between 0 and 100),
  reasons      jsonb not null default '{}',
  status       text not null default 'active' check (status in ('active', 'dismissed')),
  computed_at  timestamptz not null default now(),
  primary key (profile_id, target_id),
  check (profile_id <> target_id)
);
create index recommendations_list_idx on public.recommendations (profile_id, status, score desc);

-- ---------------------------------------------------------------------
-- Conversations (1:1 and group)
-- ---------------------------------------------------------------------
create table public.conversations (
  id                    uuid primary key default gen_random_uuid(),
  is_group              boolean not null default false,
  title                 text check (char_length(title) <= 100),
  dm_key                text unique, -- "<smaller uuid>:<larger uuid>" for 1:1 conversations
  created_by            uuid references public.profiles (id) on delete set null,
  last_message_at       timestamptz,
  last_message_preview  text,
  created_at            timestamptz not null default now()
);
create index conversations_last_msg_idx on public.conversations (last_message_at desc nulls last);

create table public.conversation_participants (
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  last_read_at     timestamptz not null default now(),
  joined_at        timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);
create index conversation_participants_profile_idx on public.conversation_participants (profile_id);

create or replace function public.is_conversation_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_participants where conversation_id = cid and profile_id = auth.uid())
$$;

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null default '' check (char_length(body) <= 5000),
  attachment_path  text,
  attachment_name  text,
  attachment_mime  text,
  attachment_size  bigint,
  created_at       timestamptz not null default now(),
  check (char_length(body) > 0 or attachment_path is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_body_trgm on public.messages using gin (body extensions.gin_trgm_ops);

create or replace function public.on_message_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = case
           when char_length(new.body) > 0 then left(new.body, 140)
           else '📎 ' || coalesce(new.attachment_name, 'Attachment') end
   where id = new.conversation_id;
  -- sender has implicitly read everything up to their own message
  update public.conversation_participants
     set last_read_at = new.created_at
   where conversation_id = new.conversation_id and profile_id = new.sender_id;
  return null;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_inserted();

-- Opens (or returns) the 1:1 conversation with another user.
create or replace function public.get_or_create_dm(other_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  k text;
  cid uuid;
begin
  if me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if other_id = me then raise exception 'Cannot message yourself'; end if;
  if not exists (select 1 from public.profiles where id = other_id and not is_suspended) then
    raise exception 'User not found';
  end if;
  k := least(me, other_id)::text || ':' || greatest(me, other_id)::text;
  select id into cid from public.conversations where dm_key = k;
  if cid is null then
    insert into public.conversations (is_group, dm_key, created_by) values (false, k, me)
    on conflict (dm_key) do update set dm_key = excluded.dm_key
    returning id into cid;
    insert into public.conversation_participants (conversation_id, profile_id)
    values (cid, me), (cid, other_id) on conflict do nothing;
  end if;
  return cid;
end $$;

-- Creates a group conversation. Members must be connections of the creator.
create or replace function public.create_group_conversation(group_title text, member_ids uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cid uuid;
  m uuid;
begin
  if me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if coalesce(trim(group_title), '') = '' then raise exception 'Group title is required'; end if;
  if coalesce(array_length(member_ids, 1), 0) < 2 then raise exception 'Pick at least two other members'; end if;
  foreach m in array member_ids loop
    if m <> me and not public.are_connected(me, m) then
      raise exception 'You can only add your connections to a group';
    end if;
  end loop;
  insert into public.conversations (is_group, title, created_by) values (true, left(trim(group_title), 100), me)
  returning id into cid;
  insert into public.conversation_participants (conversation_id, profile_id)
  select cid, x from unnest(array_append(member_ids, me)) as x group by x;
  return cid;
end $$;

-- Inbox listing with unread counts and the other participants.
create or replace function public.get_my_conversations()
returns table (
  id uuid, is_group boolean, title text, last_message_at timestamptz, last_message_preview text,
  unread_count bigint, participants jsonb
) language sql stable security definer set search_path = public as $$
  select c.id, c.is_group, c.title, c.last_message_at, c.last_message_preview,
    (select count(*) from public.messages m
      where m.conversation_id = c.id and m.created_at > me.last_read_at and m.sender_id <> auth.uid()) as unread_count,
    (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url, 'headline', p.headline)), '[]'::jsonb)
       from public.conversation_participants cp join public.profiles p on p.id = cp.profile_id
      where cp.conversation_id = c.id and cp.profile_id <> auth.uid()) as participants
  from public.conversation_participants me
  join public.conversations c on c.id = me.conversation_id
  where me.profile_id = auth.uid()
  order by coalesce(c.last_message_at, c.created_at) desc
$$;

create or replace function public.unread_message_count()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.conversation_participants me
  join public.messages m on m.conversation_id = me.conversation_id
  where me.profile_id = auth.uid() and m.created_at > me.last_read_at and m.sender_id <> auth.uid()
$$;
