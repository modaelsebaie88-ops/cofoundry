-- =====================================================================
-- Workspaces, notifications, reputation & trust, moderation, settings
-- =====================================================================

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  actor_id      uuid references public.profiles (id) on delete set null,
  type          text not null check (type in (
                  'connection_request', 'connection_accepted', 'message', 'community_reply', 'mention',
                  'opportunity_application', 'application_update', 'event_reminder', 'recommendation',
                  'workspace', 'mentorship', 'verification', 'moderation', 'system')),
  title         text not null check (char_length(title) <= 200),
  body          text check (char_length(body) <= 500),
  link          text check (char_length(link) <= 300),
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where not is_read;

create table public.notification_preferences (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  -- map of notification type -> enabled (missing key = enabled)
  prefs       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create or replace function public.notify(
  p_recipient uuid, p_actor uuid, p_type text, p_title text, p_body text default null, p_link text default null
) returns void language plpgsql security definer set search_path = public as $$
declare enabled boolean;
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;
  select coalesce((prefs ->> p_type)::boolean, true) into enabled
    from public.notification_preferences where profile_id = p_recipient;
  if enabled is false then return; end if;
  insert into public.notifications (recipient_id, actor_id, type, title, body, link)
  values (p_recipient, p_actor, p_type, left(p_title, 200), left(p_body, 500), p_link);
end $$;
revoke execute on function public.notify(uuid, uuid, text, text, text, text) from public, anon, authenticated;

-- Profile + preferences rows on sign-up (defined here because it needs notification_preferences).
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Workspaces
-- ---------------------------------------------------------------------
create table public.workspaces (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 80),
  description  text check (char_length(description) <= 2000),
  created_by   uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

create table public.workspace_members (
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'member')),
  joined_at     timestamptz not null default now(),
  primary key (workspace_id, profile_id)
);
create index workspace_members_profile_idx on public.workspace_members (profile_id);

create or replace function public.is_workspace_member(wid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = wid and profile_id = auth.uid())
$$;
create or replace function public.is_workspace_owner(wid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = wid and profile_id = auth.uid() and role = 'owner')
$$;

create or replace function public.on_workspace_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guard', 'on', true);
  insert into public.workspace_members (workspace_id, profile_id, role) values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  perform set_config('app.bypass_guard', 'off', true);
  return null;
end $$;
create trigger workspaces_owner after insert on public.workspaces
  for each row execute function public.on_workspace_created();

-- Owners may only invite people they're connected with.
create or replace function public.guard_workspace_member()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.role = 'owner' then raise exception 'Cannot add another owner' using errcode = '42501'; end if;
    if not public.are_connected(auth.uid(), new.profile_id) then
      raise exception 'You can only invite your connections';
    end if;
  elsif new.role is distinct from old.role then
    raise exception 'Roles cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger workspace_members_guard before insert or update on public.workspace_members
  for each row execute function public.guard_workspace_member();

create table public.workspace_tasks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  description   text check (char_length(description) <= 4000),
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  assignee_id   uuid references public.profiles (id) on delete set null,
  due_date      date,
  created_by    uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index workspace_tasks_ws_idx on public.workspace_tasks (workspace_id, status);
create trigger workspace_tasks_updated_at before update on public.workspace_tasks
  for each row execute function public.set_updated_at();

create table public.workspace_milestones (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  description   text check (char_length(description) <= 2000),
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index workspace_milestones_ws_idx on public.workspace_milestones (workspace_id, due_date);

create table public.workspace_posts (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  kind          text not null default 'discussion' check (kind in ('update', 'discussion')),
  body          text not null check (char_length(body) between 1 and 6000),
  created_at    timestamptz not null default now()
);
create index workspace_posts_ws_idx on public.workspace_posts (workspace_id, created_at desc);

create table public.workspace_files (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  uploaded_by   uuid not null references public.profiles (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 255),
  path          text not null unique,
  size          bigint,
  mime          text,
  created_at    timestamptz not null default now()
);
create index workspace_files_ws_idx on public.workspace_files (workspace_id, created_at desc);

-- ---------------------------------------------------------------------
-- Reputation: endorsements between connected founders
-- ---------------------------------------------------------------------
create table public.endorsements (
  id           uuid primary key default gen_random_uuid(),
  endorser_id  uuid not null references public.profiles (id) on delete cascade,
  endorsee_id  uuid not null references public.profiles (id) on delete cascade,
  skill        text check (char_length(skill) <= 60),
  body         text not null check (char_length(body) between 10 and 1000),
  created_at   timestamptz not null default now(),
  unique (endorser_id, endorsee_id),
  check (endorser_id <> endorsee_id)
);
create index endorsements_endorsee_idx on public.endorsements (endorsee_id, created_at desc);

-- Community contribution & collaboration history, computed from real activity.
create or replace function public.get_reputation(pid uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'posts', (select count(*) from public.community_posts where author_id = pid),
    'comments', (select count(*) from public.comments where author_id = pid),
    'accepted_answers', (select count(*) from public.community_posts p join public.comments c on c.id = p.accepted_comment_id
                          where c.author_id = pid and p.author_id <> pid),
    'reactions_received', (select coalesce(sum(reaction_count), 0) from public.community_posts where author_id = pid),
    'connections', (select count(*) from public.connections where status = 'accepted' and (requester_id = pid or addressee_id = pid)),
    'endorsements', (select count(*) from public.endorsements where endorsee_id = pid),
    'workspaces', (select count(*) from public.workspace_members where profile_id = pid),
    'accepted_applications', (select count(*) from public.opportunity_applications where applicant_id = pid and status = 'accepted'),
    'mentorship_sessions', (select count(*) from public.mentorship_requests where (mentor_id = pid or mentee_id = pid) and status = 'completed'),
    'events_attended', (select count(*) from public.event_registrations where profile_id = pid and attended)
  )
$$;

-- ---------------------------------------------------------------------
-- Moderation: reports
-- ---------------------------------------------------------------------
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles (id) on delete cascade,
  target_type      text not null check (target_type in ('post', 'comment', 'community_message', 'message', 'profile', 'opportunity', 'event')),
  target_id        uuid not null,
  community_id     uuid references public.communities (id) on delete set null,
  reason           text not null check (reason in ('spam', 'harassment', 'inappropriate', 'misinformation', 'scam', 'other')),
  details          text check (char_length(details) <= 1000),
  snapshot         text check (char_length(snapshot) <= 2000), -- copy of the reported content at report time
  status           text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by      uuid references public.profiles (id) on delete set null,
  resolution_note  text check (char_length(resolution_note) <= 1000),
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  unique (reporter_id, target_type, target_id)
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_community_idx on public.reports (community_id, status);

create or replace function public.guard_report()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'open'; new.resolved_by := null; new.resolved_at := null; new.resolution_note := null;
  else
    if new.status is distinct from old.status then
      new.resolved_by := auth.uid();
      new.resolved_at := case when new.status = 'open' then null else now() end;
    end if;
    new.reporter_id := old.reporter_id; new.target_type := old.target_type; new.target_id := old.target_id;
  end if;
  return new;
end $$;
create trigger reports_guard before insert or update on public.reports
  for each row execute function public.guard_report();

-- ---------------------------------------------------------------------
-- Verification requests (reviewed by admins — never automatic)
-- ---------------------------------------------------------------------
create table public.verification_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  target_type   text not null check (target_type in ('profile', 'startup')),
  startup_id    uuid references public.startups (id) on delete cascade,
  evidence      text not null check (char_length(evidence) between 20 and 3000),
  links         text[] not null default '{}' check (cardinality(links) <= 5),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id   uuid references public.profiles (id) on delete set null,
  review_note   text check (char_length(review_note) <= 1000),
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  check ((target_type = 'startup') = (startup_id is not null))
);
create unique index verification_one_pending_uidx on public.verification_requests (requester_id, target_type)
  where status = 'pending';
create index verification_status_idx on public.verification_requests (status, created_at desc);

create or replace function public.guard_verification_request()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.startup_id is not null and not public.is_startup_owner(new.startup_id) then
      raise exception 'You can only request verification for your own startup' using errcode = '42501';
    end if;
    new.status := 'pending'; new.reviewer_id := null; new.reviewed_at := null; new.review_note := null;
  else
    if not public.is_admin() then raise exception 'Only admins can review verification' using errcode = '42501'; end if;
    new.reviewer_id := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;
create trigger verification_requests_guard before insert or update on public.verification_requests
  for each row execute function public.guard_verification_request();

create or replace function public.on_verification_reviewed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return null; end if;
  perform set_config('app.bypass_guard', 'on', true);
  if new.target_type = 'profile' then
    update public.profiles set is_verified = (new.status = 'approved') where id = new.requester_id;
  else
    update public.startups set is_verified = (new.status = 'approved') where id = new.startup_id;
  end if;
  perform set_config('app.bypass_guard', 'off', true);
  perform public.notify(new.requester_id, new.reviewer_id, 'verification',
    case when new.status = 'approved' then 'Your ' || new.target_type || ' is now verified'
         else 'Your verification request was not approved' end,
    new.review_note, '/settings/verification');
  return null;
end $$;
create trigger verification_requests_reviewed after update on public.verification_requests
  for each row execute function public.on_verification_reviewed();

-- ---------------------------------------------------------------------
-- Platform settings (admin-managed)
-- ---------------------------------------------------------------------
create table public.platform_settings (
  key         text primary key check (key ~ '^[a-z_]{2,60}$'),
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
