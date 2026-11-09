-- =====================================================================
-- Notification fan-out triggers, mentions, event reminders
-- =====================================================================

create or replace function public.display_name(pid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(full_name, ''), 'Someone') from public.profiles where id = pid
$$;

-- Mentions use the markup @[Display Name](profile-uuid) produced by the composer.
create or replace function public.extract_mentions(body text)
returns uuid[] language sql immutable as $$
  select coalesce(array_agg(distinct m[1]::uuid), '{}')
  from regexp_matches(coalesce(body, ''), '@\[[^\]]{1,120}\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)', 'g') as m
$$;

-- Connections ----------------------------------------------------------
create or replace function public.on_connection_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.addressee_id, new.requester_id, 'connection_request',
      public.display_name(new.requester_id) || ' wants to connect', new.message, '/network?tab=requests');
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    perform public.notify(new.requester_id, new.addressee_id, 'connection_accepted',
      public.display_name(new.addressee_id) || ' accepted your connection request', null,
      '/founders/' || new.addressee_id);
  end if;
  return null;
end $$;
create trigger connections_notify after insert or update on public.connections
  for each row execute function public.on_connection_change();

-- Direct messages: one unread notification per conversation at a time ---
create or replace function public.on_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; conv record;
begin
  select * into conv from public.conversations where id = new.conversation_id;
  for r in select profile_id from public.conversation_participants
            where conversation_id = new.conversation_id and profile_id <> new.sender_id loop
    if not exists (select 1 from public.notifications
                    where recipient_id = r.profile_id and type = 'message' and not is_read
                      and link = '/messages/' || new.conversation_id) then
      perform public.notify(r.profile_id, new.sender_id, 'message',
        case when conv.is_group then public.display_name(new.sender_id) || ' in ' || coalesce(conv.title, 'a group')
             else 'New message from ' || public.display_name(new.sender_id) end,
        left(coalesce(nullif(new.body, ''), 'Sent an attachment'), 140),
        '/messages/' || new.conversation_id);
    end if;
  end loop;
  return null;
end $$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.on_message_notify();

-- Community posts: mentions ---------------------------------------------
create or replace function public.on_post_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid; c record;
begin
  select slug, name into c from public.communities where id = new.community_id;
  foreach uid in array public.extract_mentions(new.body) loop
    perform public.notify(uid, new.author_id, 'mention',
      public.display_name(new.author_id) || ' mentioned you in ' || c.name, new.title,
      '/communities/' || c.slug || '/posts/' || new.id);
  end loop;
  return null;
end $$;
create trigger community_posts_notify after insert on public.community_posts
  for each row execute function public.on_post_created();

-- Comments: reply to author + mentions ----------------------------------
create or replace function public.on_comment_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record; uid uuid; link text;
begin
  select cp.id, cp.title, cp.author_id, c.slug into p
    from public.community_posts cp join public.communities c on c.id = cp.community_id
   where cp.id = new.post_id;
  link := '/communities/' || p.slug || '/posts/' || p.id;
  perform public.notify(p.author_id, new.author_id, 'community_reply',
    public.display_name(new.author_id) || ' replied to "' || left(p.title, 80) || '"', left(new.body, 140), link);
  foreach uid in array public.extract_mentions(new.body) loop
    if uid <> p.author_id then
      perform public.notify(uid, new.author_id, 'mention',
        public.display_name(new.author_id) || ' mentioned you in a reply', left(p.title, 140), link);
    end if;
  end loop;
  return null;
end $$;
create trigger comments_notify after insert on public.comments
  for each row execute function public.on_comment_created();

-- Community chat: mentions ----------------------------------------------
create or replace function public.on_community_message_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid; c record;
begin
  select slug, name into c from public.communities where id = new.community_id;
  foreach uid in array public.extract_mentions(new.body) loop
    perform public.notify(uid, new.sender_id, 'mention',
      public.display_name(new.sender_id) || ' mentioned you in #' || c.name || ' chat', left(new.body, 140),
      '/communities/' || c.slug || '?tab=chat');
  end loop;
  return null;
end $$;
create trigger community_messages_notify after insert on public.community_messages
  for each row execute function public.on_community_message_created();

-- Opportunity applications ----------------------------------------------
create or replace function public.on_application_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare o record;
begin
  select id, title, author_id into o from public.opportunities where id = new.opportunity_id;
  if tg_op = 'INSERT' then
    perform public.notify(o.author_id, new.applicant_id, 'opportunity_application',
      public.display_name(new.applicant_id) || ' applied to "' || left(o.title, 80) || '"',
      left(new.message, 140), '/opportunities/' || o.id || '/manage');
  elsif new.status is distinct from old.status and new.status in ('accepted', 'declined') then
    perform public.notify(new.applicant_id, o.author_id, 'application_update',
      'Your application to "' || left(o.title, 80) || '" was ' || new.status, null, '/opportunities/' || o.id);
  end if;
  return null;
end $$;
create trigger opportunity_applications_notify after insert or update on public.opportunity_applications
  for each row execute function public.on_application_change();

-- Mentorship ---------------------------------------------------------------
create or replace function public.on_mentorship_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.mentor_id, new.mentee_id, 'mentorship',
      public.display_name(new.mentee_id) || ' requested a mentorship session', new.topic, '/mentorship?tab=requests');
  elsif new.status is distinct from old.status then
    if new.status in ('accepted', 'declined', 'completed') then
      perform public.notify(new.mentee_id, new.mentor_id, 'mentorship',
        'Mentorship request ' || new.status || ' by ' || public.display_name(new.mentor_id), new.topic, '/mentorship?tab=sessions');
    elsif new.status = 'cancelled' then
      perform public.notify(case when auth.uid() = new.mentor_id then new.mentee_id else new.mentor_id end,
        auth.uid(), 'mentorship', 'A mentorship session was cancelled', new.topic, '/mentorship?tab=requests');
    end if;
  end if;
  return null;
end $$;
create trigger mentorship_requests_notify after insert or update on public.mentorship_requests
  for each row execute function public.on_mentorship_change();

-- Workspaces -----------------------------------------------------------------
create or replace function public.on_workspace_member_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare w record;
begin
  if new.role = 'owner' then return null; end if;
  select id, name into w from public.workspaces where id = new.workspace_id;
  perform public.notify(new.profile_id, auth.uid(), 'workspace',
    'You were added to the workspace "' || w.name || '"', null, '/workspaces/' || w.id);
  return null;
end $$;
create trigger workspace_members_notify after insert on public.workspace_members
  for each row execute function public.on_workspace_member_added();

create or replace function public.on_workspace_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    perform public.notify(new.assignee_id, auth.uid(), 'workspace',
      'You were assigned "' || left(new.title, 100) || '"', null, '/workspaces/' || new.workspace_id || '?tab=tasks');
  end if;
  return null;
end $$;
create trigger workspace_tasks_notify after insert or update on public.workspace_tasks
  for each row execute function public.on_workspace_task_change();

create or replace function public.on_workspace_post_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; w record;
begin
  select id, name into w from public.workspaces where id = new.workspace_id;
  for r in select profile_id from public.workspace_members where workspace_id = new.workspace_id and profile_id <> new.author_id loop
    perform public.notify(r.profile_id, new.author_id, 'workspace',
      public.display_name(new.author_id) || case when new.kind = 'update' then ' posted an update in ' else ' started a discussion in ' end || w.name,
      left(new.body, 140), '/workspaces/' || w.id || '?tab=discussions');
  end loop;
  return null;
end $$;
create trigger workspace_posts_notify after insert on public.workspace_posts
  for each row execute function public.on_workspace_post_created();

-- Report resolution -------------------------------------------------------
create or replace function public.on_report_resolved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> old.status and new.status in ('resolved', 'dismissed') then
    perform public.notify(new.reporter_id, null, 'moderation',
      case when new.status = 'resolved' then 'Thanks — action was taken on content you reported'
           else 'Your report was reviewed' end,
      new.resolution_note, null);
  end if;
  return null;
end $$;
create trigger reports_notify after update on public.reports
  for each row execute function public.on_report_resolved();

-- Event reminders (24h before start). Scheduled with pg_cron below and also
-- callable on demand; idempotent thanks to reminder_sent.
create or replace function public.send_event_reminders()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  perform set_config('app.bypass_guard', 'on', true);
  for r in
    select er.event_id, er.profile_id, e.title, e.starts_at
      from public.event_registrations er join public.events e on e.id = er.event_id
     where er.status = 'registered' and not er.reminder_sent
       and e.starts_at > now() and e.starts_at <= now() + interval '24 hours'
  loop
    perform public.notify(r.profile_id, null, 'event_reminder',
      'Reminder: "' || left(r.title, 100) || '" starts soon',
      'Starts ' || to_char(r.starts_at at time zone 'UTC', 'Mon DD, HH24:MI') || ' UTC', '/events/' || r.event_id);
    update public.event_registrations set reminder_sent = true where event_id = r.event_id and profile_id = r.profile_id;
    n := n + 1;
  end loop;
  perform set_config('app.bypass_guard', 'off', true);
  return n;
end $$;
revoke execute on function public.send_event_reminders() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('event-reminders', '*/10 * * * *', 'select public.send_event_reminders()');
exception when others then
  raise notice 'pg_cron unavailable (%); schedule public.send_event_reminders() externally', sqlerrm;
end $$;
