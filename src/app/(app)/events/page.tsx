import type { Metadata } from "next"
import Link from "next/link"
import { format } from "date-fns"
import { CalendarDays, CheckCircle2, Globe, MapPin, Plus, Users } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EVENT_TYPES, EVENT_TYPE_KEYS } from "@/lib/constants"
import { Tag } from "@/components/shared/badges"
import { LinkButton } from "@/components/shared/link-button"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Events" }

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ type?: string; view?: string }> }) {
  const sp = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()
  const view = sp.view === "past" ? "past" : sp.view === "mine" ? "mine" : "upcoming"
  const now = new Date().toISOString()

  const { data: regs } = await supabase.from("event_registrations").select("event_id, attended").eq("profile_id", me.id).eq("status", "registered")
  const registered = new Set((regs ?? []).map((r) => r.event_id))

  let q = supabase
    .from("events")
    .select("id, title, description, type, starts_at, ends_at, is_online, location, capacity, registration_count, organizer_id, communities(name, slug), organizer:profiles!events_organizer_id_fkey(full_name)")
  if (view === "past") q = q.lt("ends_at", now).order("starts_at", { ascending: false })
  else q = q.gte("ends_at", now).order("starts_at")
  if (view === "mine") q = q.in("id", registered.size ? [...registered] : ["00000000-0000-0000-0000-000000000000"])
  if (sp.type && EVENT_TYPE_KEYS.includes(sp.type as never)) q = q.eq("type", sp.type as never)
  const { data: events } = await q.limit(60)

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { view: view === "upcoming" ? undefined : view, type: sp.type, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    return `/events${p.size ? `?${p}` : ""}`
  }

  return (
    <div>
      <PageHeader
        title="Events"
        description="Networking events, hackathons, pitch nights, webinars, workshops and accelerator programs."
        actions={
          <LinkButton href="/events/new">
            <Plus /> Host an event
          </LinkButton>
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border bg-white p-0.5">
          {(["upcoming", "mine", "past"] as const).map((v) => (
            <Link key={v} href={link({ view: v === "upcoming" ? undefined : v })} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", view === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}>
              {v === "mine" ? "My registrations" : v === "past" ? "Past" : "Upcoming"}
            </Link>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Link href={link({ type: undefined })} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", !sp.type ? "border-primary/30 bg-accent text-accent-foreground" : "bg-white text-muted-foreground")}>
            All types
          </Link>
          {EVENT_TYPE_KEYS.map((t) => (
            <Link key={t} href={link({ type: t })} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", sp.type === t ? "border-primary/30 bg-accent text-accent-foreground" : "bg-white text-muted-foreground")}>
              {EVENT_TYPES[t]}
            </Link>
          ))}
        </div>
      </div>
      {events?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => {
            const d = new Date(e.starts_at)
            const full = e.capacity != null && e.registration_count >= e.capacity
            return (
              <Link key={e.id} href={`/events/${e.id}`} className="card-hover flex flex-col rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-start gap-4">
                  <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-soft-gradient leading-none">
                    <span className="text-[11px] font-semibold text-primary uppercase">{format(d, "MMM")}</span>
                    <span className="text-xl font-semibold">{format(d, "d")}</span>
                  </span>
                  <div className="min-w-0">
                    <Tag tone="primary">{EVENT_TYPES[e.type]}</Tag>
                    <p className="mt-1.5 line-clamp-2 font-semibold">{e.title}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{e.description}</p>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" /> {format(d, "EEE, MMM d · p")}
                  </p>
                  <p className="flex items-center gap-1.5">
                    {e.is_online ? <Globe className="size-3.5" /> : <MapPin className="size-3.5" />} {e.is_online ? "Online" : e.location}
                    {e.communities && <span>· {e.communities.name}</span>}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> {e.registration_count} going{e.capacity ? ` · ${Math.max(0, e.capacity - e.registration_count)} spots left` : ""}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                  <span className="text-muted-foreground">Hosted by {e.organizer?.full_name}</span>
                  {registered.has(e.id) ? (
                    <span className="flex items-center gap-1 font-medium text-emerald-600">
                      <CheckCircle2 className="size-3.5" /> Registered
                    </span>
                  ) : full ? (
                    <span className="font-medium text-muted-foreground">Full</span>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={CalendarDays} title={view === "mine" ? "You haven't registered for any upcoming events" : "No events found"} action={<LinkButton href="/events/new">Host an event</LinkButton>} />
      )}
    </div>
  )
}
