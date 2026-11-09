import type { Metadata } from "next"
import Link from "next/link"
import { Briefcase, Plus } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { OPPORTUNITY_LIST_SELECT } from "@/lib/queries/opportunities"
import { OPPORTUNITY_TYPES, OPPORTUNITY_TYPE_KEYS } from "@/lib/constants"
import { OpportunityRow, type OpportunityListItem } from "@/components/opportunities/opportunity-row"
import { EmptyState, PageHeader, Panel } from "@/components/shared/page-header"
import { LinkButton } from "@/components/shared/link-button"
import { Pagination } from "@/components/shared/pagination"
import { OpportunityFilters } from "./opportunity-filters"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Opportunities" }
const PAGE_SIZE = 20

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; industry?: string; stage?: string; collab?: string; remote?: string; page?: string }>
}) {
  const sp = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()
  const page = Math.max(1, Number(sp.page) || 1)

  let q = supabase.from("opportunities").select(OPPORTUNITY_LIST_SELECT, { count: "exact" }).eq("status", "open")
  if (sp.type && OPPORTUNITY_TYPE_KEYS.includes(sp.type as never)) q = q.eq("type", sp.type as never)
  if (sp.q) {
    const s = sp.q.replace(/[%,()]/g, " ").trim()
    q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`)
  }
  if (Number(sp.industry)) q = q.eq("category_id", Number(sp.industry))
  if (sp.stage) q = q.eq("stage", sp.stage as never)
  if (sp.collab) q = q.eq("collaboration_type", sp.collab as never)
  if (sp.remote === "1") q = q.eq("is_remote", true)
  const [{ data, count }, { data: categories }, { count: mine }] = await Promise.all([
    q.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("author_id", me.id),
  ])

  const typeLink = (t?: string) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v && k !== "type" && k !== "page") p.set(k, v)
    if (t) p.set("type", t)
    const s = p.toString()
    return `/opportunities${s ? `?${s}` : ""}`
  }

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description="Co-founder searches, roles, partnerships, investment and services from founders across the network."
        actions={
          <>
            <LinkButton href="/opportunities/mine" variant="outline">
              My opportunities & applications{mine ? ` (${mine})` : ""}
            </LinkButton>
            <LinkButton href="/opportunities/new">
              <Plus /> Post opportunity
            </LinkButton>
          </>
        }
      />
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        <Link href={typeLink()} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium", !sp.type ? "border-primary/30 bg-accent text-accent-foreground" : "bg-white text-muted-foreground hover:text-foreground")}>
          All
        </Link>
        {OPPORTUNITY_TYPE_KEYS.map((t) => (
          <Link
            key={t}
            href={typeLink(t)}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium", sp.type === t ? "border-primary/30 bg-accent text-accent-foreground" : "bg-white text-muted-foreground hover:text-foreground")}
          >
            {OPPORTUNITY_TYPES[t].label.replace("Looking for ", "")}
          </Link>
        ))}
      </div>
      <OpportunityFilters categories={categories ?? []} total={count ?? 0} />
      {data?.length ? (
        <>
          <Panel className="mt-4 divide-y">
            {data.map((o) => (
              <OpportunityRow key={o.id} opportunity={o as unknown as OpportunityListItem} />
            ))}
          </Panel>
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
        </>
      ) : (
        <EmptyState
          className="mt-4"
          icon={Briefcase}
          title="No opportunities match"
          description="Try a different category, or publish what you're looking for."
          action={<LinkButton href="/opportunities/new">Post an opportunity</LinkButton>}
        />
      )}
    </div>
  )
}
