import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftRight, Repeat2, Sparkles } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { DemoBadge, Tag } from "@/components/shared/badges"
import { EmptyState, PageHeader, SectionTitle } from "@/components/shared/page-header"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import { CreateExchangeDialog, ExchangeOwnerMenu, ProposeButton } from "./exchange-client"

export const metadata: Metadata = { title: "Skill exchange" }

const FORMAT = { async: "Async help", calls: "Video calls", pairing: "Pairing sessions", any: "Flexible format" } as const

type Exchange = {
  id: string
  title: string
  offer_skills: string[]
  want_skills: string[]
  description: string | null
  format: keyof typeof FORMAT
  status: string
  created_at: string
  author: { id: string; full_name: string; avatar_url: string | null; headline: string | null; is_demo: boolean } | null
}

export default async function SkillExchangePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()
  const [{ data: rows }, { data: mySkills }, { data: allSkills }] = await Promise.all([
    supabase
      .from("skill_exchanges")
      .select("id, title, offer_skills, want_skills, description, format, status, created_at, author:profiles!skill_exchanges_author_id_fkey(id, full_name, avatar_url, headline, is_demo)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profile_skills").select("kind, skills(name)").eq("profile_id", me.id),
    supabase.from("skills").select("name").order("name").limit(1000),
  ])
  const has = new Set((mySkills ?? []).filter((s) => s.kind === "has" && s.skills).map((s) => s.skills!.name.toLowerCase()))
  const learn = new Set((mySkills ?? []).filter((s) => s.kind === "learn" && s.skills).map((s) => s.skills!.name.toLowerCase()))
  const exchanges = (rows ?? []) as unknown as Exchange[]
  const mine = exchanges.filter((e) => e.author?.id === me.id)
  const term = (q ?? "").toLowerCase().trim()
  const open = exchanges.filter(
    (e) =>
      e.status === "open" &&
      e.author?.id !== me.id &&
      (!term || e.title.toLowerCase().includes(term) || [...e.offer_skills, ...e.want_skills].some((s) => s.toLowerCase().includes(term)))
  )

  // Two-way fit: they offer what you want to learn AND/OR want what you have.
  const fit = (e: Exchange) => {
    const theyTeach = e.offer_skills.filter((s) => learn.has(s.toLowerCase()))
    const youTeach = e.want_skills.filter((s) => has.has(s.toLowerCase()))
    return { theyTeach, youTeach, score: theyTeach.length * 2 + youTeach.length * 2 + (theyTeach.length && youTeach.length ? 5 : 0) }
  }
  const matches = open.map((e) => ({ e, f: fit(e) })).filter((x) => x.f.score > 0).sort((a, b) => b.f.score - a.f.score)

  const card = (e: Exchange, f?: ReturnType<typeof fit>, owner = false) => (
    <article key={e.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <UserAvatar name={e.author?.full_name} src={e.author?.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <Link href={`/founders/${e.author?.id}`} className="text-sm font-medium hover:underline">
            {e.author?.full_name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            <RelativeTime date={e.created_at} /> · {FORMAT[e.format]}
          </p>
        </div>
        {e.author?.is_demo && <DemoBadge />}
        {owner && <ExchangeOwnerMenu id={e.id} status={e.status as "open" | "closed"} />}
      </div>
      <p className="mt-3 font-semibold">{e.title}</p>
      {e.description && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{e.description}</p>}
      <div className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground uppercase">Offers</p>
          <div className="flex flex-wrap gap-1">
            {e.offer_skills.map((s) => (
              <Tag key={s} tone={f?.theyTeach.includes(s) ? "success" : "default"}>
                {s}
              </Tag>
            ))}
          </div>
        </div>
        <ArrowLeftRight className="mx-auto hidden size-4 text-muted-foreground sm:block" />
        <div>
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground uppercase">Wants</p>
          <div className="flex flex-wrap gap-1">
            {e.want_skills.map((s) => (
              <Tag key={s} tone={f?.youTeach.includes(s) ? "primary" : "default"}>
                {s}
              </Tag>
            ))}
          </div>
        </div>
      </div>
      {f && (f.theyTeach.length > 0 || f.youTeach.length > 0) && (
        <p className="mt-3 text-xs text-foreground/80">
          {f.theyTeach.length > 0 && <>They can teach you <b>{f.theyTeach.join(", ")}</b>. </>}
          {f.youTeach.length > 0 && <>You can help with <b>{f.youTeach.join(", ")}</b>.</>}
        </p>
      )}
      {!owner && e.author && (
        <div className="mt-auto pt-4">
          <ProposeButton exchangeId={e.id} authorName={e.author.full_name} />
        </div>
      )}
      {owner && e.status === "closed" && <p className="mt-3 text-xs text-muted-foreground">Closed — hidden from others.</p>}
    </article>
  )

  return (
    <div className="space-y-10">
      <PageHeader
        title="Skill exchange"
        description="Trade expertise with other founders — help with what you know, get help with what you don't. Matches use the skills on your profile."
        actions={<CreateExchangeDialog skillSuggestions={(allSkills ?? []).map((s) => s.name)} />}
      />
      {matches.length > 0 && (
        <section>
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" /> Best exchanges for you
            </span>
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{matches.slice(0, 6).map(({ e, f }) => card(e, f))}</div>
        </section>
      )}
      {mine.length > 0 && (
        <section>
          <SectionTitle>Your listings</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{mine.map((e) => card(e, undefined, true))}</div>
        </section>
      )}
      <section>
        <SectionTitle
          action={
            <form action="/skill-exchange">
              <input name="q" defaultValue={q} placeholder="Filter by skill" className="h-8 w-48 rounded-lg border bg-white px-3 text-sm outline-none focus:border-ring" />
            </form>
          }
        >
          All open exchanges ({open.length})
        </SectionTitle>
        {open.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{open.map((e) => card(e, fit(e)))}</div>
        ) : (
          <EmptyState icon={Repeat2} title="No open exchanges" description="Be the first — list what you can offer and what you want to learn." />
        )}
      </section>
    </div>
  )
}
