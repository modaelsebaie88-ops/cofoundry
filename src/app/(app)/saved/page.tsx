import type { Metadata } from "next"
import Link from "next/link"
import { Bookmark, BookOpen, Briefcase, CalendarDays, Rocket, User } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EmptyState, PageHeader, Panel, SectionTitle } from "@/components/shared/page-header"
import { SaveButton } from "@/components/shared/save-button"
import { UserAvatar } from "@/components/shared/user-avatar"

export const metadata: Metadata = { title: "Saved" }

export default async function SavedPage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: saved } = await supabase.from("saved_items").select("item_type, item_id").eq("profile_id", me.id).order("created_at", { ascending: false })
  const ids = (t: string) => (saved ?? []).filter((s) => s.item_type === t).map((s) => s.item_id)
  const none = ["00000000-0000-0000-0000-000000000000"]
  const [founders, opps, resources, events, startups] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, headline").in("id", ids("founder").length ? ids("founder") : none),
    supabase.from("opportunities").select("id, title, status").in("id", ids("opportunity").length ? ids("opportunity") : none),
    supabase.from("resources").select("id, slug, title").in("id", ids("resource").length ? ids("resource") : none),
    supabase.from("events").select("id, title, starts_at").in("id", ids("event").length ? ids("event") : none),
    supabase.from("startups").select("id, slug, name").in("id", ids("startup").length ? ids("startup") : none),
  ])

  const sections = [
    { key: "founder", title: "Founders", icon: User, rows: (founders.data ?? []).map((f) => ({ id: f.id, href: `/founders/${f.id}`, title: f.full_name, sub: f.headline, avatar: f })) },
    { key: "opportunity", title: "Opportunities", icon: Briefcase, rows: (opps.data ?? []).map((o) => ({ id: o.id, href: `/opportunities/${o.id}`, title: o.title, sub: o.status === "closed" ? "Closed" : "Open" })) },
    { key: "resource", title: "Resources", icon: BookOpen, rows: (resources.data ?? []).map((r) => ({ id: r.id, href: `/resources/${r.slug}`, title: r.title, sub: null })) },
    { key: "event", title: "Events", icon: CalendarDays, rows: (events.data ?? []).map((e) => ({ id: e.id, href: `/events/${e.id}`, title: e.title, sub: new Date(e.starts_at).toLocaleDateString() })) },
    { key: "startup", title: "Startups", icon: Rocket, rows: (startups.data ?? []).map((s) => ({ id: s.id, href: `/startups/${s.slug}`, title: s.name, sub: null })) },
  ].filter((s) => s.rows.length)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Saved items" description="Founders, opportunities and resources you've bookmarked." />
      {sections.length ? (
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.key}>
              <SectionTitle>
                <span className="flex items-center gap-1.5">
                  <s.icon className="size-4 text-primary" /> {s.title} ({s.rows.length})
                </span>
              </SectionTitle>
              <Panel className="divide-y">
                {s.rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    {"avatar" in r && r.avatar && <UserAvatar name={r.avatar.full_name} src={r.avatar.avatar_url} size="sm" />}
                    <Link href={r.href} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium hover:text-primary">{r.title}</p>
                      {r.sub && <p className="truncate text-xs text-muted-foreground">{r.sub}</p>}
                    </Link>
                    <SaveButton itemType={s.key as "founder"} itemId={r.id} saved />
                  </div>
                ))}
              </Panel>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bookmark} title="Nothing saved yet" description="Use the bookmark icon on founders, opportunities and resources to keep track of them." />
      )}
    </div>
  )
}
