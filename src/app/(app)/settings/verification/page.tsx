import type { Metadata } from "next"
import { format } from "date-fns"
import { BadgeCheck } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { VerificationForm } from "./verification-form"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Verification" }

const tone = { pending: "bg-amber-50 text-amber-700", approved: "bg-emerald-50 text-emerald-700", rejected: "bg-muted text-muted-foreground" } as const

export default async function VerificationPage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const [{ data: startup }, { data: requests }] = await Promise.all([
    supabase.from("startups").select("name, is_verified").eq("owner_id", me.id).maybeSingle(),
    supabase.from("verification_requests").select("id, target_type, status, evidence, review_note, created_at, reviewed_at").eq("requester_id", me.id).order("created_at", { ascending: false }),
  ])
  const pending = (t: string) => (requests ?? []).some((r) => r.target_type === t && r.status === "pending")

  return (
    <div className="space-y-6">
      <Panel className="p-5 sm:p-8">
        <SectionTitle>How verification works</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Verification badges are never granted automatically. A Cofoundry administrator reviews the evidence you provide — e.g. a LinkedIn profile matching your
          name, company registration, a company-domain email or press coverage — and approves or rejects the request.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <BadgeCheck className={cn("size-4", me.is_verified ? "text-primary" : "text-muted-foreground")} /> Founder profile
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{me.is_verified ? "Verified" : pending("profile") ? "Under review" : "Not verified"}</p>
            {!me.is_verified && !pending("profile") && <VerificationForm targetType="profile" />}
          </div>
          <div className="rounded-xl border p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <BadgeCheck className={cn("size-4", startup?.is_verified ? "text-primary" : "text-muted-foreground")} /> Startup {startup ? `· ${startup.name}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {!startup ? "Create a startup profile first" : startup.is_verified ? "Verified" : pending("startup") ? "Under review" : "Not verified"}
            </p>
            {startup && !startup.is_verified && !pending("startup") && <VerificationForm targetType="startup" />}
          </div>
        </div>
      </Panel>
      {requests && requests.length > 0 && (
        <Panel className="p-5 sm:p-8">
          <SectionTitle>Request history</SectionTitle>
          <ul className="divide-y">
            {requests.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize">{r.target_type} verification</p>
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold capitalize", tone[r.status as keyof typeof tone])}>{r.status}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.evidence}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted {format(new Date(r.created_at), "MMM d, yyyy")}
                  {r.review_note && ` · Reviewer note: ${r.review_note}`}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
