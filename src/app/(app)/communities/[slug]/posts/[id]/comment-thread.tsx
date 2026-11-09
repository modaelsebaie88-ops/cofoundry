"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Flag, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { acceptAnswer, addComment, deleteComment } from "@/actions/communities"
import { VerifiedBadge } from "@/components/shared/badges"
import { MentionTextarea } from "@/components/shared/mention-textarea"
import { RelativeTime } from "@/components/shared/relative-time"
import { ReportDialog } from "@/components/shared/report-dialog"
import { RichText } from "@/components/shared/rich-text"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { JoinButton } from "../../../join-button"

type Comment = {
  id: string
  body: string
  created_at: string
  author: { id: string; full_name: string; avatar_url: string | null; headline: string | null; is_verified: boolean } | null
}

export function CommentThread({
  postId,
  postType,
  acceptedId,
  canAccept,
  canModerate,
  isMember,
  communityId,
  slug,
  meId,
  comments,
}: {
  postId: string
  postType: string
  acceptedId: string | null
  canAccept: boolean
  canModerate: boolean
  isMember: boolean
  communityId: string
  slug: string
  meId: string
  comments: Comment[]
}) {
  const [body, setBody] = useState("")
  const [pending, start] = useTransition()
  const [reporting, setReporting] = useState<Comment | null>(null)
  const router = useRouter()
  const ordered = [...comments].sort((a, b) => Number(b.id === acceptedId) - Number(a.id === acceptedId))

  const submit = () =>
    start(async () => {
      const r = await addComment(postId, body)
      if (r.ok) {
        setBody("")
        router.refresh()
      } else toast.error(r.error)
    })

  return (
    <section className="mt-6" aria-label="Replies">
      <h2 className="mb-3 text-sm font-semibold">
        {comments.length} {comments.length === 1 ? "reply" : "replies"}
      </h2>

      {isMember ? (
        <div className="mb-6 rounded-2xl border bg-card p-4 shadow-soft">
          <MentionTextarea
            rows={3}
            value={body}
            onValueChange={setBody}
            communityId={communityId}
            placeholder={postType === "question" ? "Share your answer or experience…" : "Add to the discussion… (type @ to mention)"}
            aria-label="Reply"
          />
          <div className="mt-2 flex justify-end">
            <Button onClick={submit} disabled={pending || !body.trim()}>
              {pending && <Loader2 className="animate-spin" />} Reply
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">Join this community to reply.</p>
          <div className="w-44">
            <JoinButton communityId={communityId} slug={slug} joined={false} />
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {ordered.map((c) => {
          const accepted = c.id === acceptedId
          const mine = c.author?.id === meId
          return (
            <li key={c.id} className={cn("rounded-2xl border bg-card p-4", accepted && "border-emerald-300 bg-emerald-50/40")}>
              <div className="flex items-start gap-3">
                <UserAvatar name={c.author?.full_name} src={c.author?.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <Link href={`/founders/${c.author?.id}`} className="flex items-center gap-1 text-sm font-semibold hover:underline">
                      {c.author?.full_name ?? "Deleted user"} {c.author?.is_verified && <VerifiedBadge />}
                    </Link>
                    <RelativeTime date={c.created_at} className="text-xs text-muted-foreground" />
                    {accepted && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="size-3.5" /> Accepted answer
                      </span>
                    )}
                  </div>
                  <RichText text={c.body} className="mt-1" />
                  <div className="mt-2 flex gap-1">
                    {postType === "question" && canAccept && !mine && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          start(async () => {
                            const r = await acceptAnswer(postId, accepted ? null : c.id)
                            r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
                          })
                        }
                      >
                        <CheckCircle2 /> {accepted ? "Unmark answer" : "Accept answer"}
                      </Button>
                    )}
                    {(mine || canModerate) && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          start(async () => {
                            if (!confirm("Delete this reply?")) return
                            const r = await deleteComment(c.id)
                            r.ok ? router.refresh() : toast.error(r.error)
                          })
                        }
                      >
                        <Trash2 /> Delete
                      </Button>
                    )}
                    {!mine && (
                      <Button variant="ghost" size="xs" onClick={() => setReporting(c)}>
                        <Flag /> Report
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {reporting && (
        <ReportDialog open onOpenChange={(o) => !o && setReporting(null)} targetType="comment" targetId={reporting.id} communityId={communityId} snapshot={reporting.body} />
      )}
    </section>
  )
}
