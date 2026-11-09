import type { Metadata } from "next"
import Link from "next/link"
import { MessageSquare, Users } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { CategoryIcon } from "@/components/shared/category-icon"
import { PageHeader, SectionTitle } from "@/components/shared/page-header"
import { JoinButton } from "./join-button"
import { ComposeLauncher } from "./compose-launcher"

export const metadata: Metadata = { title: "Communities" }

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<{ compose?: string }> }) {
  const { compose } = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()
  const [{ data: communities }, { data: memberships }] = await Promise.all([
    supabase.from("communities").select("id, slug, name, description, icon, member_count, post_count, category_id").order("name"),
    supabase.from("community_members").select("community_id").eq("profile_id", me.id),
  ])
  const joined = new Set((memberships ?? []).map((m) => m.community_id))
  const mine = (communities ?? []).filter((c) => joined.has(c.id))
  const others = (communities ?? []).filter((c) => !joined.has(c.id)).sort((a, b) => b.member_count - a.member_count)

  const card = (c: NonNullable<typeof communities>[number], i: number) => (
    <div key={c.id} className="card-hover flex flex-col rounded-2xl border bg-card p-5 shadow-soft">
      <Link href={`/communities/${c.slug}`} className="flex items-start gap-3">
        <CategoryIcon name={c.icon} seed={i} />
        <div className="min-w-0">
          <p className="font-semibold hover:underline">{c.name}</p>
          <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3" /> {c.member_count.toLocaleString()} members
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" /> {c.post_count.toLocaleString()} posts
            </span>
          </p>
        </div>
      </Link>
      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{c.description}</p>
      <div className="mt-4">
        <JoinButton communityId={c.id} slug={c.slug} joined={joined.has(c.id)} />
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Communities"
        description="Industry communities with discussions, Q&A, polls, live chat and events. Join as many as you like."
        actions={<ComposeLauncher communities={mine.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))} defaultOpen={compose === "1"} />}
      />
      {mine.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Your communities ({mine.length})</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{mine.map(card)}</div>
        </section>
      )}
      <section>
        <SectionTitle>{mine.length ? "Discover more communities" : "All communities"}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{others.map((c, i) => card(c, i + mine.length))}</div>
      </section>
    </div>
  )
}
