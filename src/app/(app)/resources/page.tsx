import type { Metadata } from "next"
import Link from "next/link"
import { BookOpen, Clock, FileText, Lightbulb, ListChecks, Star, Wrench } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getSavedSet } from "@/lib/queries/network"
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_KEYS } from "@/lib/constants"
import { Tag } from "@/components/shared/badges"
import { EmptyState, PageHeader, SectionTitle } from "@/components/shared/page-header"
import { SaveButton } from "@/components/shared/save-button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Resource library" }

const KIND_ICON = { guide: BookOpen, template: FileText, checklist: ListChecks, tool: Wrench, story: Lightbulb } as const

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; saved?: string }> }) {
  const sp = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()
  const saved = await getSavedSet(supabase, me.id, "resource")
  let q = supabase.from("resources").select("id, slug, title, summary, category, kind, read_minutes, is_featured, external_url").eq("is_published", true)
  if (sp.category && RESOURCE_CATEGORY_KEYS.includes(sp.category as never)) q = q.eq("category", sp.category as never)
  if (sp.q) {
    const s = sp.q.replace(/[%,()]/g, " ").trim()
    q = q.or(`title.ilike.%${s}%,summary.ilike.%${s}%`)
  }
  if (sp.saved === "1") q = q.in("id", saved.size ? [...saved] : ["00000000-0000-0000-0000-000000000000"])
  const { data: resources } = await q.order("is_featured", { ascending: false }).order("created_at", { ascending: false })
  const featured = !sp.category && !sp.q && !sp.saved ? (resources ?? []).filter((r) => r.is_featured) : []

  const chip = (label: string, href: string, active: boolean) => (
    <Link key={href} href={href} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium", active ? "border-primary/30 bg-accent text-accent-foreground" : "bg-white text-muted-foreground hover:text-foreground")}>
      {label}
    </Link>
  )

  const card = (r: NonNullable<typeof resources>[number]) => {
    const Icon = KIND_ICON[r.kind as keyof typeof KIND_ICON] ?? BookOpen
    return (
      <div key={r.id} className="card-hover relative flex flex-col rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex items-start justify-between gap-2">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
            <Icon className="size-5" />
          </span>
          <div className="relative z-10">
            <SaveButton itemType="resource" itemId={r.id} saved={saved.has(r.id)} />
          </div>
        </div>
        <Link href={`/resources/${r.slug}`} className="mt-3 font-semibold after:absolute after:inset-0 hover:text-primary">
          {r.title}
        </Link>
        <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground">{r.summary}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Tag>{RESOURCE_CATEGORIES[r.category]}</Tag>
          {r.read_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {r.read_minutes} min
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Resource library"
        description="Practical guides, templates and stories for every stage — curated by the Cofoundry team."
        actions={
          <form action="/resources">
            <input name="q" defaultValue={sp.q} placeholder="Search resources" className="h-9 w-56 rounded-lg border bg-white px-3 text-sm outline-none focus:border-ring" />
          </form>
        }
      />
      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
        {chip("All", "/resources", !sp.category && !sp.saved)}
        {chip(`Bookmarked (${saved.size})`, "/resources?saved=1", sp.saved === "1")}
        {RESOURCE_CATEGORY_KEYS.map((c) => chip(RESOURCE_CATEGORIES[c], `/resources?category=${c}`, sp.category === c))}
      </div>
      {featured.length > 0 && (
        <section className="mb-10">
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Star className="size-4 text-amber-500" /> Featured
            </span>
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{featured.map(card)}</div>
        </section>
      )}
      <section>
        {featured.length > 0 && <SectionTitle>All resources</SectionTitle>}
        {resources?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{resources.map(card)}</div>
        ) : (
          <EmptyState icon={BookOpen} title={sp.saved ? "No bookmarks yet" : "No resources found"} description={sp.saved ? "Bookmark guides and templates to find them here." : undefined} />
        )}
      </section>
    </div>
  )
}
