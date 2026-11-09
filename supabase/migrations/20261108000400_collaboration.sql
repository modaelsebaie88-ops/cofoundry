-- =====================================================================
-- Collaboration ecosystem: opportunities, skill exchange, events,
-- mentorship, resources, saved items
-- =====================================================================

create type public.opportunity_type as enum (
  'cofounder', 'developer', 'designer', 'marketing', 'business_partner',
  'mentor', 'investor', 'team_member', 'services_offered', 'partnership'
);

create table public.opportunities (
  id                  uuid primary key default gen_random_uuid(),
  author_id           uuid not null references public.profiles (id) on delete cascade,
  startup_id          uuid references public.startups (id) on delete set null,
  type                public.opportunity_type not null,
  title               text not null check (char_length(title) between 5 and 140),
  description         text not null check (char_length(description) between 20 and 6000),
  required_skills     text[] not null default '{}',
  category_id         smallint references public.categories (id) on delete set null,
  stage               public.startup_stage,
  collaboration_type  public.collab_type not null,
  requirements        text check (char_length(requirements) <= 3000),
  location            text check (char_length(location) <= 120),
  is_remote           boolean not null default true,
  status              text not null default 'open' check (status in ('open', 'closed')),
  application_count   int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index opportunities_list_idx on public.opportunities (status, created_at desc);
create index opportunities_type_idx on public.opportunities (type);
create index opportunities_category_idx on public.opportunities (category_id);
create index opportunities_author_idx on public.opportunities (author_id);
create index opportunities_title_trgm on public.opportunities using gin (title extensions.gin_trgm_ops);
create index opportunities_skills_idx on public.opportunities using gin (required_skills);
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();

create or replace function public.guard_opportunity()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() then return new; end if;
  if tg_op = 'INSERT' then
    new.application_count := 0;
    if auth.uid() is null then return new; end if;
    if new.startup_id is not null and not public.is_startup_owner(new.startup_id) then
      raise exception 'You can only attach your own startup' using errcode = '42501';
    end if;
  else
    new.application_count := old.application_count;
    new.author_id := old.author_id;
  end if;
  return new;
end $$;
create trigger opportunities_guard before insert or update on public.opportunities
  for each row execute function public.guard_opportunity();

create table public.opportunity_applications (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities (id) on delete cascade,
  applicant_id    uuid not null references public.profiles (id) on delete cascade,
  message         text not null check (char_length(message) between 10 and 3000),
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,
  unique (opportunity_id, applicant_id)
);
create index opportunity_applications_applicant_idx on public.opportunity_applications (applicant_id);

create or replace function public.is_opportunity_author(oid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.opportunities where id = oid and author_id = auth.uid())
$$;

create or replace function public.guard_application()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if public.is_opportunity_author(new.opportunity_id) then
      raise exception 'You cannot apply to your own opportunity';
    end if;
    if not exists (select 1 from public.opportunities where id = new.opportunity_id and status = 'open') then
      raise exception 'This opportunity is closed';
    end if;
    new.status := 'pending'; new.responded_at := null;
  else
    if new.opportunity_id <> old.opportunity_id or new.applicant_id <> old.applicant_id then
      raise exception 'Application parties cannot change' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      if auth.uid() = old.applicant_id then
        if new.status <> 'withdrawn' then
          raise exception 'Applicants can only withdraw' using errcode = '42501';
        end if;
      elsif public.is_opportunity_author(old.opportunity_id) then
        if new.status not in ('accepted', 'declined') then
          raise exception 'Invalid status' using errcode = '42501';
        end if;
        new.responded_at := now();
      else
        raise exception 'Not allowed' using errcode = '42501';
      end if;
    end if;
    if auth.uid() <> old.applicant_id then new.message := old.message; end if;
  end if;
  return new;
end $$;
create trigger opportunity_applications_guard before insert or update on public.opportunity_applications
  for each row execute function public.guard_application();

create or replace function public.sync_application_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guard', 'on', true);
  if tg_op = 'INSERT' then
    update public.opportunities set application_count = application_count + 1 where id = new.opportunity_id;
  elsif tg_op = 'DELETE' then
    update public.opportunities set application_count = greatest(application_count - 1, 0) where id = old.opportunity_id;
  end if;
  perform set_config('app.bypass_guard', 'off', true);
  return null;
end $$;
create trigger opportunity_applications_count after insert or delete on public.opportunity_applications
  for each row execute function public.sync_application_count();

-- ---------------------------------------------------------------------
-- Skill exchange
-- ---------------------------------------------------------------------
create table public.skill_exchanges (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(title) between 5 and 140),
  offer_skills  text[] not null check (cardinality(offer_skills) between 1 and 10),
  want_skills   text[] not null check (cardinality(want_skills) between 1 and 10),
  description   text check (char_length(description) <= 2000),
  format        text not null default 'any' check (format in ('async', 'calls', 'pairing', 'any')),
  status        text not null default 'open' check (status in ('open', 'closed')),
  created_at    timestamptz not null default now()
);
create index skill_exchanges_list_idx on public.skill_exchanges (status, created_at desc);
create index skill_exchanges_offer_idx on public.skill_exchanges using gin (offer_skills);
create index skill_exchanges_want_idx on public.skill_exchanges using gin (want_skills);

-- ---------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------
create type public.event_type as enum (
  'networking', 'hackathon', 'pitch', 'webinar', 'workshop', 'meetup', 'accelerator'
);

create table public.events (
  id                  uuid primary key default gen_random_uuid(),
  organizer_id        uuid not null references public.profiles (id) on delete cascade,
  community_id        uuid references public.communities (id) on delete set null,
  title               text not null check (char_length(title) between 5 and 140),
  description         text not null check (char_length(description) between 20 and 6000),
  type                public.event_type not null,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  is_online           boolean not null default true,
  location            text check (char_length(location) <= 200),
  meeting_url         text check (meeting_url is null or meeting_url ~* '^https?://'),
  capacity            int check (capacity is null or capacity between 1 and 100000),
  cover_url           text,
  registration_count  int not null default 0,
  created_at          timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_upcoming_idx on public.events (starts_at);
create index events_community_idx on public.events (community_id, starts_at);
create index events_title_trgm on public.events using gin (title extensions.gin_trgm_ops);

create or replace function public.is_event_organizer(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = eid and organizer_id = auth.uid())
$$;

create table public.event_registrations (
  event_id       uuid not null references public.events (id) on delete cascade,
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  status         text not null default 'registered' check (status in ('registered', 'cancelled')),
  attended       boolean not null default false,
  reminder_sent  boolean not null default false,
  created_at     timestamptz not null default now(),
  primary key (event_id, profile_id)
);
create index event_registrations_profile_idx on public.event_registrations (profile_id);

create or replace function public.guard_event_registration()
returns trigger language plpgsql as $$
declare ev record;
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  select * into ev from public.events where id = new.event_id;
  if tg_op = 'INSERT' or (new.status = 'registered' and old.status = 'cancelled') then
    if ev.ends_at < now() then raise exception 'This event has already ended'; end if;
    if ev.capacity is not null and ev.registration_count >= ev.capacity then
      raise exception 'This event is full';
    end if;
  end if;
  if tg_op = 'INSERT' then
    new.attended := false; new.reminder_sent := false;
  else
    -- attendance is managed by the organizer, status by the attendee
    if new.attended is distinct from old.attended and not (public.is_event_organizer(new.event_id) or public.is_admin()) then
      raise exception 'Only the organizer can mark attendance' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and auth.uid() <> old.profile_id then
      raise exception 'Only the attendee can change their registration' using errcode = '42501';
    end if;
    new.reminder_sent := old.reminder_sent;
  end if;
  return new;
end $$;
create trigger event_registrations_guard before insert or update on public.event_registrations
  for each row execute function public.guard_event_registration();

create or replace function public.sync_registration_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.events e
     set registration_count = (select count(*) from public.event_registrations r
                                where r.event_id = e.id and r.status = 'registered')
   where e.id = coalesce(new.event_id, old.event_id);
  return null;
end $$;
create trigger event_registrations_count after insert or update or delete on public.event_registrations
  for each row execute function public.sync_registration_count();

-- ---------------------------------------------------------------------
-- Mentorship
-- ---------------------------------------------------------------------
create table public.mentor_profiles (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  expertise           text[] not null check (cardinality(expertise) between 1 and 15),
  focus_stages        public.startup_stage[] not null default '{}',
  about               text not null check (char_length(about) between 20 and 3000),
  availability_note   text check (char_length(availability_note) <= 300),
  session_minutes     int not null default 45 check (session_minutes between 15 and 180),
  sessions_per_month  int not null default 4 check (sessions_per_month between 1 and 60),
  is_accepting        boolean not null default true,
  rating_avg          numeric(3, 2),
  review_count        int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger mentor_profiles_updated_at before update on public.mentor_profiles
  for each row execute function public.set_updated_at();

create or replace function public.guard_mentor_profile()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() then return new; end if;
  if tg_op = 'INSERT' then
    new.rating_avg := null; new.review_count := 0;
  else
    new.rating_avg := old.rating_avg; new.review_count := old.review_count;
  end if;
  return new;
end $$;
create trigger mentor_profiles_guard before insert or update on public.mentor_profiles
  for each row execute function public.guard_mentor_profile();

-- Becoming a mentor grants the mentor role (admins/moderators keep their role).
create or replace function public.on_mentor_profile_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guard', 'on', true);
  update public.profiles set role = 'mentor' where id = new.profile_id and role = 'founder';
  perform set_config('app.bypass_guard', 'off', true);
  return null;
end $$;
create trigger mentor_profiles_role after insert on public.mentor_profiles
  for each row execute function public.on_mentor_profile_created();

create table public.mentorship_requests (
  id               uuid primary key default gen_random_uuid(),
  mentor_id        uuid not null references public.mentor_profiles (profile_id) on delete cascade,
  mentee_id        uuid not null references public.profiles (id) on delete cascade,
  topic            text not null check (char_length(topic) between 3 and 140),
  message          text not null check (char_length(message) between 10 and 3000),
  preferred_times  timestamptz[] not null default '{}' check (cardinality(preferred_times) <= 3),
  scheduled_at     timestamptz,
  meeting_url      text check (meeting_url is null or meeting_url ~* '^https?://'),
  mentor_note      text check (char_length(mentor_note) <= 1000),
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  created_at       timestamptz not null default now(),
  responded_at     timestamptz,
  check (mentor_id <> mentee_id)
);
create index mentorship_requests_mentor_idx on public.mentorship_requests (mentor_id, status);
create index mentorship_requests_mentee_idx on public.mentorship_requests (mentee_id, status);

create or replace function public.guard_mentorship_request()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.mentor_profiles where profile_id = new.mentor_id and is_accepting) then
      raise exception 'This mentor is not accepting requests right now';
    end if;
    new.status := 'pending'; new.scheduled_at := null; new.responded_at := null; new.mentor_note := null;
  else
    if new.mentor_id <> old.mentor_id or new.mentee_id <> old.mentee_id then
      raise exception 'Request parties cannot change' using errcode = '42501';
    end if;
    if auth.uid() = old.mentee_id and auth.uid() <> old.mentor_id then
      if new.status is distinct from old.status and new.status <> 'cancelled' then
        raise exception 'Mentees can only cancel a request' using errcode = '42501';
      end if;
      new.scheduled_at := old.scheduled_at; new.meeting_url := old.meeting_url; new.mentor_note := old.mentor_note;
    elsif auth.uid() = old.mentor_id then
      if new.status is distinct from old.status then
        if not ((old.status = 'pending' and new.status in ('accepted', 'declined'))
             or (old.status = 'accepted' and new.status in ('completed', 'cancelled'))) then
          raise exception 'Invalid status transition' using errcode = '42501';
        end if;
        new.responded_at := now();
      end if;
      if new.status = 'accepted' and new.scheduled_at is null then
        raise exception 'Pick a session time to accept the request';
      end if;
      new.topic := old.topic; new.message := old.message; new.preferred_times := old.preferred_times;
    else
      raise exception 'Not allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger mentorship_requests_guard before insert or update on public.mentorship_requests
  for each row execute function public.guard_mentorship_request();

create table public.mentorship_reviews (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null unique references public.mentorship_requests (id) on delete cascade,
  mentor_id    uuid not null references public.mentor_profiles (profile_id) on delete cascade,
  reviewer_id  uuid not null references public.profiles (id) on delete cascade,
  rating       int not null check (rating between 1 and 5),
  comment      text check (char_length(comment) <= 2000),
  created_at   timestamptz not null default now()
);
create index mentorship_reviews_mentor_idx on public.mentorship_reviews (mentor_id, created_at desc);

create or replace function public.guard_mentorship_review()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.mentorship_requests r
     where r.id = new.request_id and r.mentee_id = new.reviewer_id
       and r.mentor_id = new.mentor_id and r.status = 'completed'
  ) then
    raise exception 'You can only review completed sessions you attended';
  end if;
  return new;
end $$;
create trigger mentorship_reviews_guard before insert on public.mentorship_reviews
  for each row execute function public.guard_mentorship_review();

create or replace function public.sync_mentor_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare mid uuid := coalesce(new.mentor_id, old.mentor_id);
begin
  perform set_config('app.bypass_guard', 'on', true);
  update public.mentor_profiles mp
     set rating_avg = (select round(avg(rating)::numeric, 2) from public.mentorship_reviews where mentor_id = mid),
         review_count = (select count(*) from public.mentorship_reviews where mentor_id = mid)
   where mp.profile_id = mid;
  perform set_config('app.bypass_guard', 'off', true);
  return null;
end $$;
create trigger mentorship_reviews_rating after insert or update or delete on public.mentorship_reviews
  for each row execute function public.sync_mentor_rating();

-- ---------------------------------------------------------------------
-- Resource library
-- ---------------------------------------------------------------------
create type public.resource_category as enum (
  'guides', 'templates', 'pitch_decks', 'fundraising', 'marketing', 'legal_ops', 'tools', 'success_stories'
);

create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  title         text not null check (char_length(title) between 3 and 160),
  summary       text not null check (char_length(summary) <= 400),
  body          text check (char_length(body) <= 30000),
  category      public.resource_category not null,
  kind          text not null default 'guide' check (kind in ('guide', 'template', 'checklist', 'tool', 'story')),
  external_url  text check (external_url is null or external_url ~* '^https?://'),
  read_minutes  int check (read_minutes between 1 and 120),
  is_published  boolean not null default true,
  is_featured   boolean not null default false,
  author_id     uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index resources_category_idx on public.resources (category, created_at desc);
create index resources_title_trgm on public.resources using gin (title extensions.gin_trgm_ops);
create trigger resources_updated_at before update on public.resources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Saved items (bookmarks across the platform)
-- ---------------------------------------------------------------------
create table public.saved_items (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  item_type   text not null check (item_type in ('founder', 'opportunity', 'resource', 'event', 'startup', 'post')),
  item_id     uuid not null,
  created_at  timestamptz not null default now(),
  primary key (profile_id, item_type, item_id)
);
create index saved_items_recent_idx on public.saved_items (profile_id, created_at desc);
