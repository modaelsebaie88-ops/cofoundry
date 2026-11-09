"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { respondToApplication } from "@/actions/opportunities"
import { MessageButton } from "@/components/network/connect-button"
import { Tag, VerifiedBadge } from "@/components/shared/badges"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"

type Application = {
  id: string
  message: string
  status: "pending" | "accepted" | "declined"
  created_at: string
  applicant: { id: string; full_name: string; avatar_url: string | null; headline: string | null; is_verified: boolean; country: string | null; city: string | null }
}

export function ApplicationCard({ application: a }: { application: Application }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const respond = (accept: boolean) =>
    start(async () => {
      const r = await respondToApplication(a.id, accept)
      r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
    })
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link href={`/founders/${a.applicant.id}`} className="flex min-w-0 flex-1 items-start gap-3">
          <UserAvatar name={a.applicant.full_name} src={a.applicant.avatar_url} />
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-medium">
              {a.applicant.full_name} {a.applicant.is_verified && <VerifiedBadge />}
            </p>
            <p className="text-sm text-muted-foreground">{a.applicant.headline}</p>
            <p className="text-xs text-muted-foreground">
              {[a.applicant.city, a.applicant.country].filter(Boolean).join(", ")} · applied <RelativeTime date={a.created_at} />
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {a.status === "pending" ? (
            <>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => respond(false)}>
                <X /> Decline
              </Button>
              <Button size="sm" disabled={pending} onClick={() => respond(true)}>
                <Check /> Accept
              </Button>
            </>
          ) : (
            <Tag tone={a.status === "accepted" ? "success" : "default"}>{a.status === "accepted" ? "Accepted" : "Declined"}</Tag>
          )}
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-muted/50 p-4 text-sm whitespace-pre-line">{a.message}</p>
      <div className="mt-3 flex justify-end">
        <MessageButton targetId={a.applicant.id} />
      </div>
    </div>
  )
}
