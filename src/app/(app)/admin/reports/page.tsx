import type { Metadata } from "next"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { REPORT_REASONS } from "@/lib/constants"
import { EmptyState, Panel, SectionTitle } from "@/components/shared/page-header"
import { RelativeTime } from "@/components/shared/relative-time"
import { Tag } from "@/components/shared/badges"
import { ReportControls } from "./report-controls"

export const metadata: Metadata = { title: "Reports · Admin" }

function targetHref(type: string, id: string) {
  if (type === "profile") return `/founders/${id}`
  if (type === "opportunity") return `/opportunities/${id}`
  if (type === "event") return `/events/${id}`
  return null
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const showResolved = status === "closed"
  const supabase = await createClient()
  let q = supabase
    .from("reports")
    .select("id, target_type, target_id, reason, details, snapshot, status, resolution_note, created_at, communities(name, slug), reporter:profiles!reports_reporter_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100)
  q = showResolved ? q.neq("status", "open") : q.eq("status", "open")
  const { data } = await q
  return (
    <div>
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/admin/reports" className={!showResolved ? "font-semibold text-primary" : "text-muted-foreground"}>
          Open
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/admin/reports?status=closed" className={showResolved ? "font-semibold text-primary" : "text-muted-foreground"}>
          Resolved & dismissed
        </Link>
      </div>
      <SectionTitle>{showResolved ? "Closed reports" : "Open reports"}</SectionTitle>
      {data?.length ? (
        <div className="space-y-4">
          {data.map((r) => {
            const href = targetHref(r.target_type, r.target_id)
            return (
              <Panel key={r.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Tag className="bg-destructive/10 text-destructive">{REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS]}</Tag>
                  <Tag className="capitalize">{r.target_type.replace("_", " ")}</Tag>
                  {r.communities && (
                    <Link href={`/communities/${r.communities.slug}`}>
                      <Tag tone="primary">{r.communities.name}</Tag>
                    </Link>
                  )}
                  <span className="text-xs text-muted-foreground">
                    by {r.reporter?.full_name} · <RelativeTime date={r.created_at} />
                  </span>
                  {href && (
                    <Link href={href} className="ml-auto text-xs font-medium text-primary hover:underline">
                      View target
                    </Link>
                  )}
                </div>
                {r.snapshot && <blockquote className="mt-3 rounded-xl border-l-4 border-destructive/30 bg-muted/40 p-3 text-sm whitespace-pre-line">{r.snapshot}</blockquote>}
                {r.details && <p className="mt-2 text-sm text-muted-foreground">Reporter note: {r.details}</p>}
                {r.status === "open" ? (
                  <ReportControls id={r.id} canRemove={["post", "comment", "community_message", "opportunity", "event"].includes(r.target_type)} />
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground capitalize">
                    {r.status}
                    {r.resolution_note && ` — ${r.resolution_note}`}
                  </p>
                )}
              </Panel>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={ShieldCheck} title={showResolved ? "No closed reports" : "No open reports — the community is in good shape"} />
      )}
    </div>
  )
}
