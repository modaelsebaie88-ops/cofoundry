import type { Metadata } from "next"
import Link from "next/link"
import { Compass, Sparkles, Users } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { connectionStateFor, FOUNDER_CARD_SELECT, getConnectionMap, getSavedSet, toFounderCard } from "@/lib/queries/network"
import { getRecommendations } from "@/lib/queries/recommendations"
import { FounderCard } from "@/components/network/founder-card"
import { MatchCard } from "@/components/network/match-card"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { DirectoryFilters } from "./filters"
import { RecommendationControls } from "./recommendation-controls"
import { Pagination } from "@/components/shared/pagination"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Discover founders" }

const PAGE_SIZE = 24
type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []).filter(Boolean)

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()
  const tab = one(sp.tab) === "recommended" ? "recommended" : "directory"
  const [{ data: categories }, connectionMap, saved] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    getConnectionMap(supabase, me.id),
    getSavedSet(supabase, me.id, "founder"),
  ])

  const tabs = (
    <div className="mb-6 flex gap-1 border-b">
      {[
        { key: "recommended", label: "Recommended for you", icon: Sparkles },
        { key: "directory", label: "Founder directory", icon: Users },
      ].map((t) => (
        <Link
          key={t.key}
          href={t.key === "directory" ? "/discover" : "/discover?tab=recommended"}
          className={cn(
            "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition",
            tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <t.icon className="size-4" /> {t.label}
        </Link>
      ))}
    </div>
  )

  if (tab === "recommended") {
    const recs = await getRecommendations(supabase, me.id, 24)
    return (
      <div>
        <PageHeader
          title="Discover founders"
          description="Recommendations are calculated from real profile data: what you need, what others offer, skills, industry, stage and preferences. Open any card to see the full breakdown."
          actions={<RecommendationControls />}
        />
        {tabs}
        {recs.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recs.map((r) => (
              <MatchCard
                key={r.founder.id}
                founder={r.founder}
                score={r.score}
                reasons={r.reasons}
                connection={connectionStateFor(connectionMap, r.founder.id)}
                saved={saved.has(r.founder.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No recommendations yet"
            description="Complete your collaboration preferences (what you need and what you offer) to get matched."
          />
        )}
      </div>
    )
  }

  // ---------------- Directory ----------------
  const q = one(sp.q).trim()
  const industry = Number(one(sp.industry)) || null
  const skills = many(sp.skills)
  const country = one(sp.country)
  const city = one(sp.city).trim()
  const stage = one(sp.stage)
  const role = one(sp.role)
  const minYears = Number(one(sp.exp)) || 0
  const collab = many(sp.collab)
  const offers = many(sp.offers)
  const needs = many(sp.needs)
  const cofounder = one(sp.cofounder) === "1"
  const view = one(sp.view) === "list" ? "list" : "grid"
  const page = Math.max(1, Number(one(sp.page)) || 1)

  // Filters that live in related tables resolve to id sets first.
  let idFilter: string[] | null = null
  const intersect = (ids: string[]) => {
    idFilter = idFilter === null ? ids : idFilter.filter((x) => ids.includes(x))
  }
  if (industry) {
    const [a, b] = await Promise.all([
      supabase.from("profile_interests").select("profile_id").eq("category_id", industry),
      supabase.from("startups").select("owner_id").eq("category_id", industry),
    ])
    intersect([...new Set([...(a.data ?? []).map((r) => r.profile_id), ...(b.data ?? []).map((r) => r.owner_id)])])
  }
  if (skills.length) {
    const { data } = await supabase.from("profile_skills").select("profile_id, skills!inner(name)").eq("kind", "has").in("skills.name", skills)
    intersect([...new Set((data ?? []).map((r) => r.profile_id))])
  }
  if (stage) {
    const { data } = await supabase.from("startups").select("owner_id").eq("stage", stage as never)
    intersect((data ?? []).map((r) => r.owner_id))
  }

  let query = supabase
    .from("profiles")
    .select(FOUNDER_CARD_SELECT, { count: "exact" })
    .eq("onboarding_completed", true)
    .neq("id", me.id)
  if (q) {
    const safe = q.replace(/[%,()]/g, " ")
    query = query.or(`full_name.ilike.%${safe}%,headline.ilike.%${safe}%,bio.ilike.%${safe}%`)
  }
  if (idFilter !== null) query = query.in("id", (idFilter as string[]).length ? (idFilter as string[]) : ["00000000-0000-0000-0000-000000000000"])
  if (country) query = query.eq("country", country)
  if (city) query = query.ilike("city", `%${city.replace(/[%,]/g, "")}%`)
  if (role) query = query.eq("founder_role", role)
  if (minYears) query = query.gte("years_experience", minYears)
  if (collab.length) query = query.overlaps("collaboration_types", collab as never)
  if (offers.length) query = query.overlaps("offers", offers as never)
  if (needs.length) query = query.overlaps("looking_for", needs as never)
  if (cofounder) query = query.eq("seeking_cofounder", true)
  const { data, count } = await query
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const founders = (data ?? []).map((r) => toFounderCard(r as never))
  const { data: skillRows } = await supabase.from("skills").select("name").order("name").limit(1000)

  return (
    <div>
      <PageHeader title="Discover founders" description="Search the founder directory by industry, skills, stage, location and what people offer or need." />
      {tabs}
      <DirectoryFilters categories={categories ?? []} skillSuggestions={(skillRows ?? []).map((s) => s.name)} total={count ?? 0} view={view} />
      {founders.length ? (
        <>
          <div className={cn("mt-5 grid gap-4", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
            {founders.map((f) => (
              <FounderCard key={f.id} founder={f} connection={connectionStateFor(connectionMap, f.id)} layout={view} />
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
        </>
      ) : (
        <EmptyState className="mt-6" icon={Compass} title="No founders match these filters" description="Try removing a filter or broadening your search." />
      )}
    </div>
  )
}
