-- =====================================================================
-- Row-level security, storage, realtime, admin & search functions
-- =====================================================================

-- Enable RLS everywhere ---------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'categories','profiles','skills','profile_skills','profile_interests','startups','startup_members',
    'startup_milestones','communities','community_members','community_posts','poll_options','poll_votes',
    'comments','post_reactions','community_messages','connections','recommendations','conversations',
    'conversation_participants','messages','opportunities','opportunity_applications','skill_exchanges',
    'events','event_registrations','mentor_profiles','mentorship_requests','mentorship_reviews','resources',
    'saved_items','notifications','notification_preferences','workspaces','workspace_members','workspace_tasks',
    'workspace_milestones','workspace_posts','workspace_files','endorsements','reports','verification_requests',
    'platform_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Categories -----------------------------------------------------------------
create policy "categories readable by everyone" on public.categories for select using (true);
create policy "categories managed by admins" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profiles -------------------------------------------------------------------
create policy "profiles readable" on public.profiles for select using (
  id = auth.uid() or public.is_admin() or (onboarding_completed and not is_suspended)
);
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Skills ---------------------------------------------------------------------
create policy "skills readable" on public.skills for select using (true);
create policy "skills addable" on public.skills for insert to authenticated with check (public.is_active_user());
create policy "skills admin manage" on public.skills for update to authenticated using (public.is_admin());
create policy "skills admin delete" on public.skills for delete to authenticated using (public.is_admin());

create policy "profile skills readable" on public.profile_skills for select using (true);
create policy "profile skills own insert" on public.profile_skills for insert to authenticated with check (profile_id = auth.uid());
create policy "profile skills own delete" on public.profile_skills for delete to authenticated using (profile_id = auth.uid());

create policy "profile interests readable" on public.profile_interests for select using (true);
create policy "profile interests own insert" on public.profile_interests for insert to authenticated with check (profile_id = auth.uid());
create policy "profile interests own delete" on public.profile_interests for delete to authenticated using (profile_id = auth.uid());

-- Startups -------------------------------------------------------------------
create policy "startups public" on public.startups for select using (true);
create policy "startups own insert" on public.startups for insert to authenticated
  with check (owner_id = auth.uid() and public.is_active_user());
create policy "startups own update" on public.startups for update to authenticated
  using (owner_id = auth.uid() or public.is_admin());
create policy "startups own delete" on public.startups for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy "startup members public" on public.startup_members for select using (true);
create policy "startup members owner insert" on public.startup_members for insert to authenticated
  with check (public.is_startup_owner(startup_id) and public.are_connected(auth.uid(), profile_id));
create policy "startup members owner update" on public.startup_members for update to authenticated
  using (public.is_startup_owner(startup_id));
create policy "startup members remove" on public.startup_members for delete to authenticated
  using ((public.is_startup_owner(startup_id) and profile_id <> auth.uid()) or (profile_id = auth.uid() and not public.is_startup_owner(startup_id)));

create policy "milestones public" on public.startup_milestones for select using (true);
create policy "milestones owner write" on public.startup_milestones for all to authenticated
  using (public.is_startup_owner(startup_id)) with check (public.is_startup_owner(startup_id));

-- Communities ----------------------------------------------------------------
create policy "communities readable" on public.communities for select to authenticated using (true);
create policy "communities admin manage" on public.communities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "community members readable" on public.community_members for select to authenticated using (true);
create policy "community join" on public.community_members for insert to authenticated
  with check ((profile_id = auth.uid() and public.is_active_user()) or public.is_admin());
create policy "community leave or remove" on public.community_members for delete to authenticated
  using (profile_id = auth.uid() or public.is_community_moderator(community_id));
create policy "community roles admin" on public.community_members for update to authenticated
  using (public.is_admin());

create policy "posts readable" on public.community_posts for select to authenticated using (true);
create policy "posts create by members" on public.community_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_community_member(community_id) and public.is_active_user());
create policy "posts update author or mod" on public.community_posts for update to authenticated
  using (author_id = auth.uid() or public.is_community_moderator(community_id));
create policy "posts delete author or mod" on public.community_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_community_moderator(community_id));

create policy "poll options readable" on public.poll_options for select to authenticated using (true);
create policy "poll options by post author" on public.poll_options for insert to authenticated
  with check (exists (select 1 from public.community_posts p where p.id = post_id and p.author_id = auth.uid() and p.type = 'poll'));

create policy "poll votes readable" on public.poll_votes for select to authenticated using (true);
create policy "poll vote by members" on public.poll_votes for insert to authenticated
  with check (voter_id = auth.uid() and exists (
    select 1 from public.community_posts p where p.id = post_id and public.is_community_member(p.community_id)));
create policy "poll unvote" on public.poll_votes for delete to authenticated using (voter_id = auth.uid());

create policy "comments readable" on public.comments for select to authenticated using (true);
create policy "comments by members" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_user() and exists (
    select 1 from public.community_posts p where p.id = post_id and public.is_community_member(p.community_id)));
create policy "comments delete author or mod" on public.comments for delete to authenticated
  using (author_id = auth.uid() or exists (
    select 1 from public.community_posts p where p.id = post_id and public.is_community_moderator(p.community_id)));

create policy "reactions readable" on public.post_reactions for select to authenticated using (true);
create policy "react" on public.post_reactions for insert to authenticated with check (profile_id = auth.uid());
create policy "unreact" on public.post_reactions for delete to authenticated using (profile_id = auth.uid());

create policy "community chat members read" on public.community_messages for select to authenticated
  using (public.is_community_member(community_id) or public.is_community_moderator(community_id));
create policy "community chat members write" on public.community_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_community_member(community_id) and public.is_active_user());
create policy "community chat delete" on public.community_messages for delete to authenticated
  using (sender_id = auth.uid() or public.is_community_moderator(community_id));

-- Connections ------------------------------------------------------------------
create policy "connections involved read" on public.connections for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());
create policy "connections request" on public.connections for insert to authenticated
  with check (requester_id = auth.uid() and public.is_active_user());
create policy "connections respond" on public.connections for update to authenticated
  using (addressee_id = auth.uid());
create policy "connections remove" on public.connections for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "recommendations own" on public.recommendations for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Conversations ----------------------------------------------------------------
create policy "conversations members read" on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
create policy "conversations members rename" on public.conversations for update to authenticated
  using (public.is_conversation_member(id) and is_group);

create policy "participants members read" on public.conversation_participants for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "participants mark read" on public.conversation_participants for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "participants leave group" on public.conversation_participants for delete to authenticated
  using (profile_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and c.is_group));

create policy "messages members read" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "messages members send" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id) and public.is_active_user());
create policy "messages sender delete" on public.messages for delete to authenticated
  using (sender_id = auth.uid());

-- Opportunities ------------------------------------------------------------------
create policy "opportunities readable" on public.opportunities for select to authenticated
  using (status = 'open' or author_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.opportunity_applications a where a.opportunity_id = opportunities.id and a.applicant_id = auth.uid()));
create policy "opportunities create" on public.opportunities for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_user());
create policy "opportunities update own" on public.opportunities for update to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy "opportunities delete own" on public.opportunities for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy "applications parties read" on public.opportunity_applications for select to authenticated
  using (applicant_id = auth.uid() or public.is_opportunity_author(opportunity_id) or public.is_admin());
create policy "applications apply" on public.opportunity_applications for insert to authenticated
  with check (applicant_id = auth.uid() and public.is_active_user());
create policy "applications update parties" on public.opportunity_applications for update to authenticated
  using (applicant_id = auth.uid() or public.is_opportunity_author(opportunity_id));

-- Skill exchange ---------------------------------------------------------------------
create policy "exchanges readable" on public.skill_exchanges for select to authenticated using (true);
create policy "exchanges own write" on public.skill_exchanges for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_user());
create policy "exchanges own update" on public.skill_exchanges for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "exchanges own delete" on public.skill_exchanges for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Events --------------------------------------------------------------------------
create policy "events readable" on public.events for select to authenticated using (true);
create policy "events create" on public.events for insert to authenticated
  with check (organizer_id = auth.uid() and public.is_active_user()
              and (community_id is null or public.is_community_member(community_id)));
create policy "events organizer update" on public.events for update to authenticated
  using (organizer_id = auth.uid() or public.is_admin()) with check (organizer_id = auth.uid() or public.is_admin());
create policy "events organizer delete" on public.events for delete to authenticated
  using (organizer_id = auth.uid() or public.is_admin());

create policy "registrations visible" on public.event_registrations for select to authenticated
  using (profile_id = auth.uid() or public.is_event_organizer(event_id) or public.is_admin() or status = 'registered');
create policy "registrations self" on public.event_registrations for insert to authenticated
  with check (profile_id = auth.uid());
create policy "registrations update" on public.event_registrations for update to authenticated
  using (profile_id = auth.uid() or public.is_event_organizer(event_id));

-- Mentorship -------------------------------------------------------------------------
create policy "mentor profiles readable" on public.mentor_profiles for select to authenticated using (true);
create policy "mentor profile own" on public.mentor_profiles for insert to authenticated
  with check (profile_id = auth.uid() and public.is_active_user());
create policy "mentor profile own update" on public.mentor_profiles for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "mentor profile own delete" on public.mentor_profiles for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy "mentorship parties read" on public.mentorship_requests for select to authenticated
  using (mentor_id = auth.uid() or mentee_id = auth.uid());
create policy "mentorship request" on public.mentorship_requests for insert to authenticated
  with check (mentee_id = auth.uid() and public.is_active_user());
create policy "mentorship parties update" on public.mentorship_requests for update to authenticated
  using (mentor_id = auth.uid() or mentee_id = auth.uid());

create policy "reviews readable" on public.mentorship_reviews for select to authenticated using (true);
create policy "reviews by mentee" on public.mentorship_reviews for insert to authenticated
  with check (reviewer_id = auth.uid());

-- Resources --------------------------------------------------------------------------
create policy "resources readable" on public.resources for select to authenticated
  using (is_published or public.is_admin());
create policy "resources admin" on public.resources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "saved own" on public.saved_items for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Notifications ------------------------------------------------------------------------
create policy "notifications own read" on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete to authenticated using (recipient_id = auth.uid());
-- the matching engine may announce new recommendations to the current user only
create policy "notifications self recommendation" on public.notifications for insert to authenticated
  with check (recipient_id = auth.uid() and actor_id is null and type = 'recommendation');

create policy "notification prefs own" on public.notification_preferences for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Workspaces ------------------------------------------------------------------------------
create policy "workspaces members read" on public.workspaces for select to authenticated
  using (created_by = auth.uid() or public.is_workspace_member(id));
create policy "workspaces create" on public.workspaces for insert to authenticated
  with check (created_by = auth.uid() and public.is_active_user());
create policy "workspaces owner update" on public.workspaces for update to authenticated
  using (public.is_workspace_owner(id));
create policy "workspaces owner delete" on public.workspaces for delete to authenticated
  using (public.is_workspace_owner(id));

create policy "ws members read" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "ws members invite" on public.workspace_members for insert to authenticated
  with check (public.is_workspace_owner(workspace_id));
create policy "ws members remove" on public.workspace_members for delete to authenticated
  using ((public.is_workspace_owner(workspace_id) and role <> 'owner') or (profile_id = auth.uid() and role <> 'owner'));

create policy "ws tasks members" on public.workspace_tasks for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "ws tasks create" on public.workspace_tasks for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid()
              and (assignee_id is null or exists (select 1 from public.workspace_members m where m.workspace_id = workspace_tasks.workspace_id and m.profile_id = assignee_id)));
create policy "ws tasks update" on public.workspace_tasks for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "ws tasks delete" on public.workspace_tasks for delete to authenticated
  using (created_by = auth.uid() or public.is_workspace_owner(workspace_id));

create policy "ws milestones members" on public.workspace_milestones for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "ws milestones write" on public.workspace_milestones for insert to authenticated with check (public.is_workspace_member(workspace_id));
create policy "ws milestones update" on public.workspace_milestones for update to authenticated using (public.is_workspace_member(workspace_id));
create policy "ws milestones delete" on public.workspace_milestones for delete to authenticated using (public.is_workspace_member(workspace_id));

create policy "ws posts members" on public.workspace_posts for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "ws posts write" on public.workspace_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "ws posts delete" on public.workspace_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_workspace_owner(workspace_id));

create policy "ws files members" on public.workspace_files for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "ws files upload" on public.workspace_files for insert to authenticated
  with check (uploaded_by = auth.uid() and public.is_workspace_member(workspace_id));
create policy "ws files delete" on public.workspace_files for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_workspace_owner(workspace_id));

-- Endorsements --------------------------------------------------------------------------
create policy "endorsements readable" on public.endorsements for select to authenticated using (true);
create policy "endorse connections" on public.endorsements for insert to authenticated
  with check (endorser_id = auth.uid() and public.are_connected(endorser_id, endorsee_id));
create policy "endorsement withdraw" on public.endorsements for delete to authenticated
  using (endorser_id = auth.uid() or public.is_admin());

-- Reports ---------------------------------------------------------------------------------
create policy "reports file" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports read" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin()
         or (community_id is not null and public.is_community_moderator(community_id)));
create policy "reports review" on public.reports for update to authenticated
  using (public.is_admin() or (community_id is not null and public.is_community_moderator(community_id)));

-- Verification --------------------------------------------------------------------------
create policy "verification own read" on public.verification_requests for select to authenticated
  using (requester_id = auth.uid() or public.is_admin());
create policy "verification request" on public.verification_requests for insert to authenticated
  with check (requester_id = auth.uid());
create policy "verification review" on public.verification_requests for update to authenticated
  using (public.is_admin());

-- Platform settings ------------------------------------------------------------------------
create policy "settings readable" on public.platform_settings for select using (true);
create policy "settings admin" on public.platform_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Storage buckets
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif']),
  ('startup-assets', 'startup-assets', true, 8388608, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']),
  ('attachments', 'attachments', false, 26214400, null),
  ('workspace-files', 'workspace-files', false, 52428800, null)
on conflict (id) do nothing;

-- avatars/<uid>/<file>, startup-assets/<uid>/<file>: owner writes, everyone reads
create policy "public images read" on storage.objects for select
  using (bucket_id in ('avatars', 'startup-assets'));
create policy "own images write" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'startup-assets') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images update" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'startup-assets') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images delete" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'startup-assets') and (storage.foldername(name))[1] = auth.uid()::text);

-- attachments/dm/<conversation_id>/<file> and attachments/community/<community_id>/<file>
create policy "attachments read" on storage.objects for select to authenticated using (
  bucket_id = 'attachments' and (
    ((storage.foldername(name))[1] = 'dm' and public.is_conversation_member(((storage.foldername(name))[2])::uuid))
    or ((storage.foldername(name))[1] = 'community' and public.is_community_member(((storage.foldername(name))[2])::uuid))
  ));
create policy "attachments write" on storage.objects for insert to authenticated with check (
  bucket_id = 'attachments' and (
    ((storage.foldername(name))[1] = 'dm' and public.is_conversation_member(((storage.foldername(name))[2])::uuid))
    or ((storage.foldername(name))[1] = 'community' and public.is_community_member(((storage.foldername(name))[2])::uuid))
  ));

-- workspace-files/<workspace_id>/<file>
create policy "workspace files read" on storage.objects for select to authenticated
  using (bucket_id = 'workspace-files' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));
create policy "workspace files write" on storage.objects for insert to authenticated
  with check (bucket_id = 'workspace-files' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));
create policy "workspace files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'workspace-files' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));

-- =====================================================================
-- Realtime
-- =====================================================================
alter publication supabase_realtime add table
  public.messages, public.community_messages, public.notifications,
  public.community_posts, public.conversation_participants, public.workspace_tasks;

-- =====================================================================
-- Admin functions
-- =====================================================================
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  with days as (
    select generate_series((now() - interval '29 days')::date, now()::date, interval '1 day')::date as d
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'onboarded', (select count(*) from public.profiles where onboarding_completed),
      'active_7d', (select count(*) from public.profiles where last_seen_at > now() - interval '7 days'),
      'startups', (select count(*) from public.startups),
      'verified_startups', (select count(*) from public.startups where is_verified),
      'communities', (select count(*) from public.communities),
      'posts', (select count(*) from public.community_posts),
      'connections', (select count(*) from public.connections where status = 'accepted'),
      'opportunities_open', (select count(*) from public.opportunities where status = 'open'),
      'applications', (select count(*) from public.opportunity_applications),
      'messages', (select count(*) from public.messages),
      'events_upcoming', (select count(*) from public.events where starts_at > now()),
      'mentors', (select count(*) from public.mentor_profiles),
      'open_reports', (select count(*) from public.reports where status = 'open'),
      'pending_verifications', (select count(*) from public.verification_requests where status = 'pending')
    ),
    'daily', (select jsonb_agg(jsonb_build_object(
        'date', d,
        'signups', (select count(*) from public.profiles where created_at::date = d),
        'posts', (select count(*) from public.community_posts where created_at::date = d)
                 + (select count(*) from public.comments where created_at::date = d),
        'messages', (select count(*) from public.messages where created_at::date = d)
                    + (select count(*) from public.community_messages where created_at::date = d),
        'connections', (select count(*) from public.connections where status = 'accepted' and coalesce(responded_at, created_at)::date = d)
      ) order by d) from days),
    'stages', (select coalesce(jsonb_agg(jsonb_build_object('stage', stage, 'count', n)), '[]') from
                (select stage, count(*) n from public.startups group by stage) s),
    'communities', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'members', member_count, 'posts', post_count) order by member_count desc), '[]')
                      from (select name, member_count, post_count from public.communities order by member_count desc limit 8) c)
  ) into result;
  return result;
end $$;

create or replace function public.admin_list_users(q text default null, lim int default 50, off int default 0)
returns table (
  id uuid, email text, full_name text, avatar_url text, role public.app_role, is_verified boolean,
  is_suspended boolean, is_demo boolean, onboarding_completed boolean, created_at timestamptz, last_seen_at timestamptz,
  startup_name text, total bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.avatar_url, p.role, p.is_verified, p.is_suspended, p.is_demo,
           p.onboarding_completed, p.created_at, p.last_seen_at, s.name, count(*) over ()
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.startups s on s.owner_id = p.id
     where q is null or q = '' or p.full_name ilike '%' || q || '%' or u.email ilike '%' || q || '%'
     order by p.created_at desc
     limit least(lim, 200) offset off;
end $$;

-- Updates the caller's presence timestamp (cheap, called on app navigation).
create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now()
   where id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '2 minutes')
$$;
