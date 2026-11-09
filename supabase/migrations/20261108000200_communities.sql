-- =====================================================================
-- Communities: membership, feed (discussions, Q&A, polls, announcements),
-- comments, reactions, real-time group chat
-- =====================================================================

create table public.communities (
  id            uuid primary key default gen_random_uuid(),
  category_id   smallint unique references public.categories (id) on delete set null,
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name          text not null check (char_length(name) between 2 and 80),
  description   text check (char_length(description) <= 2000),
  rules         text check (char_length(rules) <= 4000),
  icon          text not null default 'users',
  member_count  int not null default 0,
  post_count    int not null default 0,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index communities_name_trgm on public.communities using gin (name extensions.gin_trgm_ops);

create table public.community_members (
  community_id  uuid not null references public.communities (id) on delete cascade,
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  role          text not null default 'member' check (role in ('member', 'moderator')),
  joined_at     timestamptz not null default now(),
  primary key (community_id, profile_id)
);
create index community_members_profile_idx on public.community_members (profile_id);

create or replace function public.is_community_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.community_members where community_id = cid and profile_id = auth.uid())
$$;

-- Platform admins and global moderators moderate every community.
create or replace function public.is_community_moderator(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or public.current_role_is('moderator')
      or exists (select 1 from public.community_members
                 where community_id = cid and profile_id = auth.uid() and role = 'moderator')
$$;

create or replace function public.sync_community_member_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities set member_count = greatest(member_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end $$;
create trigger community_members_count after insert or delete on public.community_members
  for each row execute function public.sync_community_member_count();

-- Only moderators/admins may promote members.
create or replace function public.guard_community_member()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' and new.role <> 'member' and not public.is_admin() then
    raise exception 'Only admins can add moderators' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change member roles' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger community_members_guard before insert or update on public.community_members
  for each row execute function public.guard_community_member();

-- ---------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------
create table public.community_posts (
  id                  uuid primary key default gen_random_uuid(),
  community_id        uuid not null references public.communities (id) on delete cascade,
  author_id           uuid not null references public.profiles (id) on delete cascade,
  type                text not null default 'discussion' check (type in ('discussion', 'question', 'announcement', 'poll')),
  title               text not null check (char_length(title) between 3 and 200),
  body                text not null default '' check (char_length(body) <= 10000),
  is_pinned           boolean not null default false,
  accepted_comment_id uuid,
  comment_count       int not null default 0,
  reaction_count      int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index community_posts_feed_idx on public.community_posts (community_id, is_pinned desc, created_at desc);
create index community_posts_author_idx on public.community_posts (author_id);
create index community_posts_recent_idx on public.community_posts (created_at desc);
create index community_posts_title_trgm on public.community_posts using gin (title extensions.gin_trgm_ops);

create trigger community_posts_updated_at before update on public.community_posts
  for each row execute function public.set_updated_at();

create or replace function public.sync_community_post_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set post_count = post_count + 1 where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities set post_count = greatest(post_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end $$;
create trigger community_posts_count after insert or delete on public.community_posts
  for each row execute function public.sync_community_post_count();

-- Announcements and pinning are moderator-only. Accepting an answer is author/moderator.
create or replace function public.guard_community_post()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if (new.type = 'announcement' or new.is_pinned) and not public.is_community_moderator(new.community_id) then
      raise exception 'Only moderators can publish announcements or pin posts' using errcode = '42501';
    end if;
    new.comment_count := 0; new.reaction_count := 0; new.accepted_comment_id := null;
  else
    if new.is_pinned is distinct from old.is_pinned and not public.is_community_moderator(new.community_id) then
      raise exception 'Only moderators can pin posts' using errcode = '42501';
    end if;
    if new.community_id <> old.community_id or new.author_id <> old.author_id or new.type <> old.type then
      raise exception 'Post community, author and type cannot change' using errcode = '42501';
    end if;
    -- counters are maintained by triggers only
    new.comment_count := old.comment_count;
    new.reaction_count := old.reaction_count;
  end if;
  return new;
end $$;
create trigger community_posts_guard before insert or update on public.community_posts
  for each row execute function public.guard_community_post();

create table public.poll_options (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.community_posts (id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 120),
  position    int not null default 0,
  vote_count  int not null default 0
);
create index poll_options_post_idx on public.poll_options (post_id, position);

create table public.poll_votes (
  post_id     uuid not null references public.community_posts (id) on delete cascade,
  option_id   uuid not null references public.poll_options (id) on delete cascade,
  voter_id    uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, voter_id)
);

create or replace function public.sync_poll_vote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.poll_options where id = new.option_id and post_id = new.post_id) then
      raise exception 'Option does not belong to this poll';
    end if;
    update public.poll_options set vote_count = vote_count + 1 where id = new.option_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.poll_options set vote_count = greatest(vote_count - 1, 0) where id = old.option_id;
    return old;
  end if;
  return null;
end $$;
create trigger poll_votes_count_ins before insert on public.poll_votes
  for each row execute function public.sync_poll_vote_count();
create trigger poll_votes_count_del after delete on public.poll_votes
  for each row execute function public.sync_poll_vote_count();

-- ---------------------------------------------------------------------
-- Comments & reactions
-- ---------------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.community_posts (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 5000),
  created_at  timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_author_idx on public.comments (author_id);

alter table public.community_posts
  add constraint community_posts_accepted_comment_fk
  foreign key (accepted_comment_id) references public.comments (id) on delete set null;

create or replace function public.sync_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guard', 'on', true);
  if tg_op = 'INSERT' then
    update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  perform set_config('app.bypass_guard', 'off', true);
  return null;
end $$;
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

create table public.post_reactions (
  post_id     uuid not null references public.community_posts (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create or replace function public.sync_reaction_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guard', 'on', true);
  if tg_op = 'INSERT' then
    update public.community_posts set reaction_count = reaction_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set reaction_count = greatest(reaction_count - 1, 0) where id = old.post_id;
  end if;
  perform set_config('app.bypass_guard', 'off', true);
  return null;
end $$;
create trigger post_reactions_count after insert or delete on public.post_reactions
  for each row execute function public.sync_reaction_count();

-- ---------------------------------------------------------------------
-- Community real-time chat
-- ---------------------------------------------------------------------
create table public.community_messages (
  id               uuid primary key default gen_random_uuid(),
  community_id     uuid not null references public.communities (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null default '' check (char_length(body) <= 4000),
  attachment_path  text,
  attachment_name  text,
  attachment_mime  text,
  created_at       timestamptz not null default now(),
  check (char_length(body) > 0 or attachment_path is not null)
);
create index community_messages_idx on public.community_messages (community_id, created_at desc);
