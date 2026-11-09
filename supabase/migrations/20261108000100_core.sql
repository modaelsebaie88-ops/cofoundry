-- =====================================================================
-- Cofoundry · Core schema: enums, profiles, skills, categories, startups
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.app_role as enum ('founder', 'mentor', 'moderator', 'admin');

create type public.startup_stage as enum ('idea', 'mvp', 'early_traction', 'growth', 'established');

-- Shared vocabulary used for "what I'm looking for" and "what I can offer",
-- so needs and offers can be matched directly.
create type public.capability as enum (
  'engineering', 'design', 'marketing', 'sales', 'product', 'data_ai',
  'fundraising', 'investment', 'mentorship', 'legal', 'operations',
  'business_development', 'content', 'community'
);

create type public.collab_type as enum (
  'cofounder', 'full_time', 'part_time', 'freelance', 'advisory',
  'partnership', 'skill_exchange', 'investment'
);

create type public.availability as enum ('full_time', 'part_time', 'weekends', 'few_hours_week', 'limited');

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Trusted server-side code (SECURITY DEFINER functions) can flip this flag for
-- the current transaction to bypass column-guard triggers.
create or replace function public.guard_bypassed()
returns boolean language sql stable as $$
  select coalesce(current_setting('app.bypass_guard', true), '') = 'on'
$$;

-- ---------------------------------------------------------------------
-- Categories (industries)
-- ---------------------------------------------------------------------
create table public.categories (
  id          smallint generated always as identity primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null unique check (char_length(name) between 2 and 80),
  description text,
  icon        text not null default 'sparkles',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  full_name             text not null default '' check (char_length(full_name) <= 120),
  avatar_url            text,
  headline              text check (char_length(headline) <= 160),
  bio                   text check (char_length(bio) <= 2000),
  country               text check (char_length(country) <= 80),
  city                  text check (char_length(city) <= 80),
  linkedin_url          text check (linkedin_url is null or linkedin_url ~* '^https?://'),
  website_url           text check (website_url is null or website_url ~* '^https?://'),
  role                  public.app_role not null default 'founder',
  founder_role          text check (char_length(founder_role) <= 80),
  years_experience      int check (years_experience between 0 and 60),
  previous_experience   text check (char_length(previous_experience) <= 2000),
  help_topics           text[] not null default '{}',
  looking_for           public.capability[] not null default '{}',
  offers                public.capability[] not null default '{}',
  seeking_cofounder     boolean not null default false,
  open_to_partnerships  boolean not null default false,
  collaboration_types   public.collab_type[] not null default '{}',
  availability          public.availability,
  onboarding_completed  boolean not null default false,
  is_verified           boolean not null default false,
  is_suspended          boolean not null default false,
  is_demo               boolean not null default false, -- seeded demo account, shown with a "Demo" label
  last_seen_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index profiles_name_trgm on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index profiles_headline_trgm on public.profiles using gin (headline extensions.gin_trgm_ops);
create index profiles_looking_for_idx on public.profiles using gin (looking_for);
create index profiles_offers_idx on public.profiles using gin (offers);
create index profiles_country_idx on public.profiles (country);
create index profiles_created_idx on public.profiles (created_at desc);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so they can be used inside RLS policies
-- without recursive policy evaluation)
-- ---------------------------------------------------------------------
create or replace function public.current_role_is(r public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = r)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and not is_suspended)
$$;

-- Users can never change their own role / verification / suspension.
create or replace function public.guard_profile_columns()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or public.is_admin() or auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.is_verified is distinct from old.is_verified
     or new.is_suspended is distinct from old.is_suspended
     or new.is_demo is distinct from old.is_demo then
    raise exception 'You are not allowed to change role, verification or suspension status'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- Create a profile row whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  insert into public.notification_preferences (profile_id) values (new.id) on conflict do nothing;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Skills & interests
-- ---------------------------------------------------------------------
create table public.skills (
  id          int generated always as identity primary key,
  name        extensions.citext not null unique check (char_length(name::text) between 1 and 60),
  capability  public.capability, -- which need this skill satisfies (null = uncategorised)
  created_at  timestamptz not null default now()
);
create index skills_name_trgm on public.skills using gin ((name::text) extensions.gin_trgm_ops);

create table public.profile_skills (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  skill_id    int not null references public.skills (id) on delete cascade,
  kind        text not null default 'has' check (kind in ('has', 'learn')),
  created_at  timestamptz not null default now(),
  primary key (profile_id, skill_id, kind)
);
create index profile_skills_skill_idx on public.profile_skills (skill_id, kind);

create table public.profile_interests (
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  category_id  smallint not null references public.categories (id) on delete cascade,
  primary key (profile_id, category_id)
);
create index profile_interests_category_idx on public.profile_interests (category_id);

-- ---------------------------------------------------------------------
-- Startups
-- ---------------------------------------------------------------------
create table public.startups (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique references public.profiles (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 100),
  slug             text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  tagline          text check (char_length(tagline) <= 160),
  description      text check (char_length(description) <= 5000),
  logo_url         text,
  cover_url        text,
  category_id      smallint references public.categories (id) on delete set null,
  stage            public.startup_stage not null default 'idea',
  website_url      text check (website_url is null or website_url ~* '^https?://'),
  target_market    text check (char_length(target_market) <= 300),
  business_model   text check (char_length(business_model) <= 300),
  team_size        int check (team_size between 1 and 100000),
  mission          text check (char_length(mission) <= 1000),
  vision           text check (char_length(vision) <= 1000),
  products         text check (char_length(products) <= 3000),
  current_needs    public.capability[] not null default '{}',
  location         text check (char_length(location) <= 120),
  founded_year     int check (founded_year between 1950 and 2100),
  twitter_url      text check (twitter_url is null or twitter_url ~* '^https?://'),
  linkedin_url     text check (linkedin_url is null or linkedin_url ~* '^https?://'),
  is_verified      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index startups_category_idx on public.startups (category_id);
create index startups_stage_idx on public.startups (stage);
create index startups_name_trgm on public.startups using gin (name extensions.gin_trgm_ops);

create trigger startups_updated_at before update on public.startups
  for each row execute function public.set_updated_at();

create or replace function public.guard_startup_columns()
returns trigger language plpgsql as $$
begin
  if public.guard_bypassed() or public.is_admin() or auth.uid() is null then
    return new;
  end if;
  if new.is_verified is distinct from old.is_verified or new.owner_id is distinct from old.owner_id then
    raise exception 'You are not allowed to change verification or ownership' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger startups_guard before update on public.startups
  for each row execute function public.guard_startup_columns();

create table public.startup_members (
  startup_id  uuid not null references public.startups (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  title       text check (char_length(title) <= 80),
  is_founder  boolean not null default false,
  joined_at   timestamptz not null default now(),
  primary key (startup_id, profile_id)
);
create index startup_members_profile_idx on public.startup_members (profile_id);

create table public.startup_milestones (
  id           uuid primary key default gen_random_uuid(),
  startup_id   uuid not null references public.startups (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 140),
  description  text check (char_length(description) <= 1000),
  achieved_on  date,
  created_at   timestamptz not null default now()
);
create index startup_milestones_startup_idx on public.startup_milestones (startup_id, achieved_on desc);

-- Owner automatically becomes a founding team member.
create or replace function public.add_startup_owner_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.startup_members (startup_id, profile_id, title, is_founder)
  values (new.id, new.owner_id, (select founder_role from public.profiles where id = new.owner_id), true)
  on conflict do nothing;
  return new;
end $$;
create trigger startups_add_owner after insert on public.startups
  for each row execute function public.add_startup_owner_member();

create or replace function public.is_startup_owner(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.startups where id = sid and owner_id = auth.uid())
$$;
