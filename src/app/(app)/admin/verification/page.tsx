import type { Metadata } from "next"
import Link from "next/link"
import { format } from "date-fns"
import { BadgeCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { EmptyState, Panel, SectionTitle } from "@/components/shared/page-header"
import { Tag } from "@/components/shared/badges"
import { UserAvatar } from "@/components/shared/user-avatar"
import { ReviewControls } from "./review-controls"

export const metadata: Metadata = { title: "Verification · Admin" }

export default async function AdminVerificationPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("verification_requests")
    .select("id, target_type, evidence, links, status, review_note, created_at, reviewed_at, startups(name, slug), requester:profiles!verification_requests_requester_id_fkey(id, full_name, avatar_url, headline, linkedin_url)")
    .order("created_at", { ascending: false })
    .limit(100)
  const pending = (data ?? []).filter((r) => r.status === "pending")
  const reviewed = (data ?? []).filter((r) => r.status !== "pending")
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Pending review ({pending.length})</SectionTitle>
        {pending.length ? (
          <div className="space-y-4">
            {pending.map((r) => (
              <Panel key={r.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <Link href={`/founders/${r.requester?.id}`} className="flex items-center gap-3">
                    <UserAvatar name={r.requester?.full_name} src={r.requester?.avatar_url} />
                    <span>
                      <span className="block font-medium">{r.requester?.full_name}</span>
                      <span className="block text-xs text-muted-foreground">{r.requester?.headline}</span>
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Tag tone="primary" className="capitalize">
                      {r.target_type}
                      {r.startups && `: ${r.startups.name}`}
                    </Tag>
                    <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d")}</span>
                  </div>
                </div>
                <p className="mt-4 rounded-xl bg-muted/50 p-4 text-sm whitespace-pre-line">{r.evidence}</p>
                {(r.links.length > 0 || r.requester?.linkedin_url) && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {[...r.links, ...(r.requester?.linkedin_url ? [r.requester.linkedin_url] : [])].map((l) => (
                      <li key={l}>
                        <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary hover:underline">
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <ReviewControls id={r.id} />
              </Panel>
            ))}
          </div>
        ) : (
          <EmptyState icon={BadgeCheck} title="No pending verification requests" />
        )}
      </section>
      {reviewed.length > 0 && (
        <section>
          <SectionTitle>Recently reviewed</SectionTitle>
          <Panel className="divide-y">
            {reviewed.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="flex-1">
                  {r.requester?.full_name} · <span className="capitalize">{r.target_type}</span>
                  {r.review_note && <span className="text-muted-foreground"> — {r.review_note}</span>}
                </span>
                <Tag tone={r.status === "approved" ? "success" : "default"} className="capitalize">
                  {r.status}
                </Tag>
              </div>
            ))}
          </Panel>
        </section>
      )}
    </div>
  )
}
