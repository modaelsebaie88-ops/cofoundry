import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, CalendarDays, Clock, Globe, MapPin, Users, Video } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EVENT_TYPES } from "@/lib/constants"
import { Tag } from "@/components/shared/badges"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { ReportButton } from "@/components/shared/report-dialog"
import { RichText } from "@/components/shared/rich-text"
import { UserAvatar } from "@/components/shared/user-avatar"
import { EventActions } from "./event-actions"
import { AttendanceList } from "./attendance-list"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("events").select("title").eq("id", id).maybeSingle()
  return { title: data?.title ?? "Event" }
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: e } = await supabase
    .from("events")
    .select(
      "id, organizer_id, title, description, type, starts_at, ends_at, is_online, location, capacity, registration_count, communities(name, slug), organizer:profiles!events_organizer_id_fkey(id, full_name, avatar_url, headline)"
    )
    .eq("id", id)
    .maybeSingle()
  if (!e) notFound()
  const isOrganizer = e.organizer_id === me.id || me.role === "admin"
  const [{ data: mine }, { data: attendees }, { data: meetingUrl }] = await Promise.all([
    supabase.from("event_registrations").select("status").eq("event_id", id).eq("profile_id", me.id).maybeSingle(),
    supabase
      .from("event_registrations")
      .select("attended, profiles(id, full_name, avatar_url, headline)")
      .eq("event_id", id)
      .eq("status", "registered")
      .order("created_at"),
    supabase.rpc("get_event_meeting_url", { eid: id }),
  ])
  const registered = mine?.status === "registered"
  const start = new Date(e.starts_at)
  const end = new Date(e.ends_at)
  const ended = end < new Date()
  const full = e.capacity != null && e.registration_count >= e.capacity

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All events
      </Link>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Panel className="overflow-hidden">
            <div className="bg-soft-gradient p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="primary">{EVENT_TYPES[e.type]}</Tag>
                {e.communities && (
                  <Link href={`/communities/${e.communities.slug}`}>
                    <Tag>{e.communities.name}</Tag>
                  </Link>
                )}
                {ended && <Tag>Ended</Tag>}
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">{e.title}</h1>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" /> {format(start, "EEEE, MMMM d, yyyy")}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> {format(start, "p")} – {format(end, end.toDateString() === start.toDateString() ? "p" : "MMM d, p")}
                </p>
                <p className="flex items-center gap-2">
                  {e.is_online ? <Globe className="size-4 text-primary" /> : <MapPin className="size-4 text-primary" />} {e.is_online ? "Online" : e.location}
                </p>
                <p className="flex items-center gap-2">
                  <Users className="size-4 text-primary" /> {e.registration_count} registered{e.capacity ? ` of ${e.capacity}` : ""}
                </p>
              </div>
            </div>
          </Panel>
          <Panel className="p-6">
            <SectionTitle>About this event</SectionTitle>
            <RichText text={e.description} />
          </Panel>
          {isOrganizer && <AttendanceList eventId={e.id} ended={ended} attendees={(attendees ?? []).filter((a) => a.profiles).map((a) => ({ ...a.profiles!, attended: a.attended }))} />}
        </div>
        <aside className="space-y-6">
          <Panel className="p-5">
            <EventActions
              event={{ id: e.id, title: e.title, description: e.description, starts_at: e.starts_at, ends_at: e.ends_at, location: e.is_online ? meetingUrl ?? "Online" : e.location ?? "" }}
              registered={registered}
              isOrganizer={e.organizer_id === me.id}
              ended={ended}
              full={full}
            />
            {e.is_online && meetingUrl && !ended && (
              <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-lg border bg-white py-2 text-sm font-medium text-primary hover:bg-accent">
                <Video className="size-4" /> Join meeting link
              </a>
            )}
            {e.is_online && !registered && !isOrganizer && <p className="mt-3 text-center text-xs text-muted-foreground">The meeting link is shared with registered attendees.</p>}
          </Panel>
          <Panel className="p-5">
            <SectionTitle>Organizer</SectionTitle>
            <Link href={`/founders/${e.organizer?.id}`} className="flex items-center gap-3">
              <UserAvatar name={e.organizer?.full_name} src={e.organizer?.avatar_url} />
              <span className="min-w-0">
                <span className="block font-medium">{e.organizer?.full_name}</span>
                <span className="line-clamp-2 block text-xs text-muted-foreground">{e.organizer?.headline}</span>
              </span>
            </Link>
          </Panel>
          <Panel className="p-5">
            <SectionTitle>Attendees ({attendees?.length ?? 0})</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {(attendees ?? []).slice(0, 24).map(
                (a) =>
                  a.profiles && (
                    <Link key={a.profiles.id} href={`/founders/${a.profiles.id}`} title={a.profiles.full_name}>
                      <UserAvatar name={a.profiles.full_name} src={a.profiles.avatar_url} size="sm" />
                    </Link>
                  )
              )}
            </div>
          </Panel>
          {!isOrganizer && (
            <div className="flex justify-end">
              <ReportButton targetType="event" targetId={e.id} snapshot={e.title} label />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
