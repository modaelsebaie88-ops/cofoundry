-- =====================================================================
-- Refinements discovered while building the UI
-- =====================================================================

-- 1) Let PostgREST embed the mentor's profile directly from a request.
alter table public.mentorship_requests
  add constraint mentorship_requests_mentor_profile_fkey foreign key (mentor_id) references public.profiles (id) on delete cascade;
alter table public.mentorship_reviews
  add constraint mentorship_reviews_mentor_profile_fkey foreign key (mentor_id) references public.profiles (id) on delete cascade;

-- 2) Event meeting links are private: only registered attendees, the organizer
--    and admins can read them. Column-level privileges hide the column from the
--    API; a SECURITY DEFINER function returns it to authorised users.
revoke select on public.events from anon, authenticated;
grant select (
  id, organizer_id, community_id, title, description, type, starts_at, ends_at, is_online,
  location, capacity, cover_url, registration_count, created_at
) on public.events to anon, authenticated;

create or replace function public.get_event_meeting_url(eid uuid)
returns text language sql stable security definer set search_path = public as $$
  select e.meeting_url from public.events e
   where e.id = eid
     and (e.organizer_id = auth.uid() or public.is_admin()
          or exists (select 1 from public.event_registrations r
                      where r.event_id = e.id and r.profile_id = auth.uid() and r.status = 'registered'))
$$;

-- The registration guard runs as the calling user, so it must only read columns
-- that remain granted after the meeting_url restriction above.
create or replace function public.guard_event_registration()
returns trigger language plpgsql as $$
declare ev record;
begin
  if public.guard_bypassed() or auth.uid() is null then return new; end if;
  select e.ends_at, e.capacity, e.registration_count into ev from public.events e where e.id = new.event_id;
  if tg_op = 'INSERT' or (new.status = 'registered' and old.status = 'cancelled') then
    if ev.ends_at < now() then raise exception 'This event has already ended'; end if;
    if ev.capacity is not null and ev.registration_count >= ev.capacity then
      raise exception 'This event is full';
    end if;
  end if;
  if tg_op = 'INSERT' then
    new.attended := false; new.reminder_sent := false;
  else
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
