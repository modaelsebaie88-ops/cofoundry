import type { Metadata } from "next"
import Link from "next/link"
import { format } from "date-fns"
import { BookOpen, Briefcase, CalendarDays, Rocket, Search, User, Users } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EVENT_TYPES, OPPORTUNITY_TYPES, RESOURCE_CATEGORIES, type EventType, type OpportunityType, type ResourceCategory, type StartupStage } from "@/lib/constants"
import { EmptyState, PageHeader, Panel } from "@/components/shared/page-header"
import { StageBadge, Tag, VerifiedBadge } from "@/components/shared/badges"
import { StartupLogo, UserAvatar } from "@/components/shared/user-avatar"
import { CategoryIcon } from "@/components/shared/category-icon"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Search" }

const KINDS = [
  { key: "all", label: "All", icon: Search },
  { key: "founders", label: "Founders", icon: User },
  { key: "startups", label: "Startups", icon: Rocket },
  { key: "communities", label: "Communities", icon: Users },
  { key: "opportunities", label: "Opportunities", icon: Briefcase },
  { key: "events", label: "Events", icon: CalendarDays },
  { key: "resources", label: "Resources", icon: BookOpen },
] as const

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; sort?: string }> }) {
  const sp = await searchParams
  await requireProfile()
  const supabase = await createClient()
  const q = (sp.q ?? "").trim().slice(0, 100)
  const type = KINDS.some((k) => k.key === sp.type) ? sp.type! : "all"
  const newest = sp.sort === "newest"
  const s = q.replace(/[%,()*]/g, " ").trim()
  const want = (k: string) => type === "all" || type === k
  const limit = type === "all" ? 5 : 40

  const empty = { data: [] as never[], count: 0 }
  const [founders, skillMatches, startups, communities, opportunities, events, resources, popular] = await Promise.all([
    s && want("founders")
      ? supabase.from("profiles").select("id, full_name, avatar_url, headline, is_verified, created_at", { count: "exact" }).eq("onboarding_completed", true).or(`full_name.ilike.%${s}%,headline.ilike.%${s}%`).order(newest ? "created_at" : "last_seen_at", { ascending: false, nullsFirst: false }).limit(limit)
      : empty,
    s && want("founders") ? supabase.from("profile_skills").select("profile_id, skills!inner(name)").eq("kind", "has").ilike("skills.name", `%${s}%`).limit(60) : { data: [] as { profile_id: string }[] },
    s && want("startups")
      ? supabase.from("startups").select("id, slug, name, tagline, stage, logo_url, is_verified, categories(name)", { count: "exact" }).or(`name.ilike.%${s}%,tagline.ilike.%${s}%,description.ilike.%${s}%`).order("created_at", { ascending: false }).limit(limit)
      : empty,
    s && want("communities") ? supabase.from("communities").select("id, slug, name, description, icon, member_count", { count: "exact" }).or(`name.ilike.%${s}%,description.ilike.%${s}%`).order("member_count", { ascending: false }).limit(limit) : empty,
    s && want("opportunities")
      ? supabase.from("opportunities").select("id, title, type, created_at, author:profiles!opportunities_author_id_fkey(full_name)", { count: "exact" }).eq("status", "open").or(`title.ilike.%${s}%,description.ilike.%${s}%`).order("created_at", { ascending: false }).limit(limit)
      : empty,
    s && want("events") ? supabase.from("events").select("id, title, type, starts_at", { count: "exact" }).gte("ends_at", new Date().toISOString()).or(`title.ilike.%${s}%,description.ilike.%${s}%`).order("starts_at").limit(limit) : empty,
    s && want("resources") ? supabase.from("resources").select("id, slug, title, summary, category", { count: "exact" }).eq("is_published", true).or(`title.ilike.%${s}%,summary.ilike.%${s}%`).limit(limit) : empty,
    supabase.from("categories").select("name").order("sort_order").limit(8),
  ])

  // Founders whose skills match the query, merged after name/headline matches.
  let founderRows = (founders.data ?? []) as { id: string; full_name: string; avatar_url: string | null; headline: string | null; is_verified: boolean }[]
  const extraIds = [...new Set((skillMatches.data ?? []).map((r) => r.profile_id))].filter((id) => !founderRows.some((f) => f.id === id))
  if (extraIds.length && founderRows.length < limit) {
    const { data } = await supabase.from("profiles").select("id, full_name, avatar_url, headline, is_verified").eq("onboarding_completed", true).in("id", extraIds.slice(0, limit - founderRows.length))
    founderRows = [...founderRows, ...(data ?? [])]
  }

  const counts: Record<string, number> = {
    founders: Math.max(founders.count ?? 0, founderRows.length),
    startups: startups.count ?? 0,
    communities: communities.count ?? 0,
    opportunities: opportunities.count ?? 0,
    events: events.count ?? 0,
    resources: resources.count ?? 0,
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { q, type: type === "all" ? undefined : type, sort: sp.sort, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    return `/search?${p}`
  }

  const section = (key: string, title: string, body: React.ReactNode) =>
    want(key) && counts[key] > 0 ? (
      <section key={key}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {title} <span className="font-normal text-muted-foreground">({counts[key]})</span>
          </h2>
          {type === "all" && counts[key] > limit && (
            <Link href={href({ type: key })} className="text-xs font-medium text-primary hover:underline">
              See all
            </Link>
          )}
        </div>
        <Panel className="divide-y">{body}</Panel>
      </section>
    ) : null

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={q ? `Results for “${q}”` : "Search"} description={q ? `${total} results across Cofoundry` : "Search founders, startups, communities, opportunities, events and resources."} />
      <form action="/search" className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={q} autoFocus={!q} placeholder="Try “fintech”, “Python”, “pitch deck”…" className="h-11 w-full rounded-xl border bg-white pr-3 pl-10 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/25" />
        {type !== "all" && <input type="hidden" name="type" value={type} />}
      </form>
      {q && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          {KINDS.map((k) => (
            <Link key={k.key} href={href({ type: k.key === "all" ? undefined : k.key })} className={cn("flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium", type === k.key ? "border-primary/30 bg-accent text-accent-foreground" : "bg-white text-muted-foreground hover:text-foreground")}>
              <k.icon className="size-3" /> {k.label}
              {k.key !== "all" && <span className="opacity-70">{counts[k.key]}</span>}
            </Link>
          ))}
          <Link href={href({ sort: newest ? undefined : "newest" })} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            Sort: {newest ? "Newest" : "Relevance"}
          </Link>
        </div>
      )}
      {!q ? (
        <div>
          <p className="mb-2 text-sm font-medium">Suggested searches</p>
          <div className="flex flex-wrap gap-2">
            {[...(popular.data ?? []).map((c) => c.name), "Technical co-founder", "Fundraising", "Product design", "Pitch deck"].map((t) => (
              <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}>
                <Tag className="px-3 py-1 text-sm hover:bg-accent">{t}</Tag>
              </Link>
            ))}
          </div>
        </div>
      ) : total === 0 ? (
        <EmptyState icon={Search} title="No results" description="Try a broader term, a skill, an industry, or check the spelling." />
      ) : (
        <div className="space-y-6">
          {section(
            "founders",
            "Founders",
            founderRows.slice(0, limit).map((f) => (
              <Link key={f.id} href={`/founders/${f.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <UserAvatar name={f.full_name} src={f.avatar_url} size="sm" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-medium">
                    {f.full_name} {f.is_verified && <VerifiedBadge />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{f.headline}</span>
                </span>
              </Link>
            ))
          )}
          {section(
            "startups",
            "Startups",
            (startups.data ?? []).map((x: { id: string; slug: string; name: string; tagline: string | null; stage: StartupStage; logo_url: string | null; is_verified: boolean; categories: { name: string } | null }) => (
              <Link key={x.id} href={`/startups/${x.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <StartupLogo name={x.name} src={x.logo_url} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-medium">
                    {x.name} {x.is_verified && <VerifiedBadge label="Verified startup" />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{x.tagline ?? x.categories?.name}</span>
                </span>
                <StageBadge stage={x.stage} />
              </Link>
            ))
          )}
          {section(
            "communities",
            "Communities",
            (communities.data ?? []).map((c: { id: string; slug: string; name: string; description: string | null; icon: string; member_count: number }, i: number) => (
              <Link key={c.id} href={`/communities/${c.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <CategoryIcon name={c.icon} size="sm" seed={i} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.description}</span>
                </span>
                <span className="text-xs text-muted-foreground">{c.member_count} members</span>
              </Link>
            ))
          )}
          {section(
            "opportunities",
            "Opportunities",
            (opportunities.data ?? []).map((o: { id: string; title: string; type: OpportunityType; author: { full_name: string } | null }) => (
              <Link key={o.id} href={`/opportunities/${o.id}`} className="block px-4 py-3 hover:bg-muted/40">
                <span className="block text-sm font-medium">{o.title}</span>
                <span className="text-xs text-muted-foreground">
                  {OPPORTUNITY_TYPES[o.type].label} · {o.author?.full_name}
                </span>
              </Link>
            ))
          )}
          {section(
            "events",
            "Events",
            (events.data ?? []).map((e: { id: string; title: string; type: EventType; starts_at: string }) => (
              <Link key={e.id} href={`/events/${e.id}`} className="block px-4 py-3 hover:bg-muted/40">
                <span className="block text-sm font-medium">{e.title}</span>
                <span className="text-xs text-muted-foreground">
                  {EVENT_TYPES[e.type]} · {format(new Date(e.starts_at), "EEE, MMM d")}
                </span>
              </Link>
            ))
          )}
          {section(
            "resources",
            "Resources",
            (resources.data ?? []).map((r: { id: string; slug: string; title: string; summary: string; category: ResourceCategory }) => (
              <Link key={r.id} href={`/resources/${r.slug}`} className="block px-4 py-3 hover:bg-muted/40">
                <span className="block text-sm font-medium">{r.title}</span>
                <span className="text-xs text-muted-foreground">
                  {RESOURCE_CATEGORIES[r.category]} · {r.summary}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
