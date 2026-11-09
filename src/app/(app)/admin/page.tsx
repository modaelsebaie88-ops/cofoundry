import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, BadgeCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { STAGES, type StartupStage } from "@/lib/constants"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { BarList, TrendChart } from "./charts"

export const metadata: Metadata = { title: "Admin" }

type Stats = {
  totals: Record<string, number>
  daily: { date: string; signups: number; posts: number; messages: number; connections: number }[]
  stages: { stage: StartupStage; count: number }[]
  communities: { name: string; members: number; posts: number }[]
}

export default async function AdminOverview() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_stats")
  if (error || !data) return <Panel className="p-6 text-sm text-destructive">Couldn&apos;t load analytics: {error?.message}</Panel>
  const s = data as unknown as Stats
  const t = s.totals
  const sum = (k: keyof Stats["daily"][number]) => s.daily.reduce((a, d) => a + Number(d[k]), 0)

  const tiles = [
    { label: "Total users", value: t.users, sub: `${t.onboarded} completed onboarding` },
    { label: "Active founders (7d)", value: t.active_7d, sub: t.users ? `${Math.round((t.active_7d / t.users) * 100)}% of users` : "" },
    { label: "Startups", value: t.startups, sub: `${t.verified_startups} verified` },
    { label: "Connections", value: t.connections, sub: `${sum("connections")} in the last 30 days` },
    { label: "Open opportunities", value: t.opportunities_open, sub: `${t.applications} applications total` },
    { label: "Community posts", value: t.posts, sub: `${t.communities} communities` },
    { label: "Direct messages", value: t.messages, sub: `${sum("messages")} incl. community chat in 30 days` },
    { label: "Mentors", value: t.mentors, sub: `${t.events_upcoming} upcoming events` },
  ]

  return (
    <div className="space-y-6">
      {(t.open_reports > 0 || t.pending_verifications > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {t.open_reports > 0 && (
            <Link href="/admin/reports" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 hover:bg-amber-100/60">
              <AlertTriangle className="size-5" /> <span><b>{t.open_reports}</b> open report{t.open_reports > 1 ? "s" : ""} need review</span>
            </Link>
          )}
          {t.pending_verifications > 0 && (
            <Link href="/admin/verification" className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 hover:bg-violet-100/60">
              <BadgeCheck className="size-5" /> <span><b>{t.pending_verifications}</b> verification request{t.pending_verifications > 1 ? "s" : ""} pending</span>
            </Link>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((x) => (
          <Panel key={x.label} className="p-4">
            <p className="text-xs text-muted-foreground">{x.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{Number(x.value).toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{x.sub}</p>
          </Panel>
        ))}
      </div>
      <section>
        <SectionTitle>Platform engagement · last 30 days</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <TrendChart title="New sign-ups" total={sum("signups")} data={s.daily.map((d) => ({ date: d.date, value: Number(d.signups) }))} />
          <TrendChart title="Community posts & replies" total={sum("posts")} data={s.daily.map((d) => ({ date: d.date, value: Number(d.posts) }))} />
          <TrendChart title="Messages (direct + community chat)" total={sum("messages")} data={s.daily.map((d) => ({ date: d.date, value: Number(d.messages) }))} />
          <TrendChart title="New connections" total={sum("connections")} data={s.daily.map((d) => ({ date: d.date, value: Number(d.connections) }))} />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <BarList title="Startups by stage" unit="startups" data={(Object.keys(STAGES) as StartupStage[]).map((k) => ({ label: STAGES[k].label, value: s.stages.find((x) => x.stage === k)?.count ?? 0 }))} />
        <BarList title="Largest communities" unit="members" data={s.communities.map((c) => ({ label: c.name, value: c.members }))} />
      </div>
    </div>
  )
}
