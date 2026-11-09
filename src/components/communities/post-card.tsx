"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Megaphone, MessageCircle, MoreHorizontal, Pin, PinOff, ThumbsUp, Trash2, Flag, BarChart3, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { deletePost, setPinned, toggleReaction, votePoll } from "@/actions/communities"
import { DemoBadge, VerifiedBadge } from "@/components/shared/badges"
import { RelativeTime } from "@/components/shared/relative-time"
import { ReportDialog } from "@/components/shared/report-dialog"
import { RichText } from "@/components/shared/rich-text"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn, truncate } from "@/lib/utils"

export type PostData = {
  id: string
  community_id: string
  type: "discussion" | "question" | "announcement" | "poll"
  title: string
  body: string
  is_pinned: boolean
  accepted_comment_id: string | null
  comment_count: number
  reaction_count: number
  created_at: string
  author: { id: string; full_name: string; avatar_url: string | null; headline: string | null; is_verified: boolean; is_demo: boolean } | null
  poll_options?: { id: string; label: string; position: number; vote_count: number }[]
}

const TYPE_META = {
  discussion: null,
  question: { label: "Question", icon: HelpCircle, cls: "bg-sky-50 text-sky-700" },
  announcement: { label: "Announcement", icon: Megaphone, cls: "bg-amber-50 text-amber-700" },
  poll: { label: "Poll", icon: BarChart3, cls: "bg-violet-50 text-violet-700" },
}

export function PostCard({
  post,
  slug,
  meId,
  canModerate,
  reacted,
  myVote,
  full,
}: {
  post: PostData
  slug: string
  meId: string
  canModerate: boolean
  reacted: boolean
  myVote?: string | null
  full?: boolean
}) {
  const router = useRouter()
  const [liked, setLiked] = useState(reacted)
  const [likes, setLikes] = useState(post.reaction_count)
  const [reporting, setReporting] = useState(false)
  const [pending, start] = useTransition()
  const meta = TYPE_META[post.type]
  const isAuthor = post.author?.id === meId
  const href = `/communities/${slug}/posts/${post.id}`

  return (
    <article className={cn("rounded-2xl border bg-card p-5 shadow-soft", post.is_pinned && "border-primary/25 bg-gradient-to-b from-accent/40 to-card")}>
      <header className="flex items-start gap-3">
        <UserAvatar name={post.author?.full_name} src={post.author?.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/founders/${post.author?.id}`} className="flex items-center gap-1 text-sm font-semibold hover:underline">
              {post.author?.full_name ?? "Deleted user"} {post.author?.is_verified && <VerifiedBadge />}
            </Link>
            {post.author?.is_demo && <DemoBadge />}
            <RelativeTime date={post.created_at} className="text-xs text-muted-foreground" />
          </div>
          <p className="truncate text-xs text-muted-foreground">{post.author?.headline}</p>
        </div>
        <div className="flex items-center gap-1">
          {post.is_pinned && (
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              <Pin className="size-3" /> Pinned
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Post options" />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {canModerate && (
                <DropdownMenuItem
                  onClick={() =>
                    start(async () => {
                      const r = await setPinned(post.id, !post.is_pinned)
                      r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
                    })
                  }
                >
                  {post.is_pinned ? <PinOff /> : <Pin />} {post.is_pinned ? "Unpin" : "Pin to top"}
                </DropdownMenuItem>
              )}
              {(isAuthor || canModerate) && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    start(async () => {
                      if (!confirm("Delete this post and its replies?")) return
                      const r = await deletePost(post.id)
                      if (r.ok) {
                        toast.success("Post deleted")
                        if (full) router.push(`/communities/${slug}`)
                        router.refresh()
                      } else toast.error(r.error)
                    })
                  }
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              )}
              {!isAuthor && (
                <DropdownMenuItem onClick={() => setReporting(true)}>
                  <Flag /> Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mt-3">
        {meta && (
          <span className={cn("mb-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold", meta.cls)}>
            <meta.icon className="size-3" /> {meta.label}
          </span>
        )}
        {full ? (
          <h1 className="text-xl font-semibold tracking-tight">{post.title}</h1>
        ) : (
          <Link href={href} className="block text-base font-semibold hover:text-primary">
            {post.title}
          </Link>
        )}
        {post.body && (full ? <RichText text={post.body} className="mt-2" /> : <RichText text={truncate(post.body, 320)} className="mt-1.5 text-foreground/80" />)}
      </div>

      {post.type === "poll" && post.poll_options && <Poll postId={post.id} options={post.poll_options} myVote={myVote ?? null} />}

      <footer className="mt-4 flex items-center gap-1 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={liked}
          disabled={pending}
          className={cn(liked && "text-primary")}
          onClick={() => {
            const next = !liked
            setLiked(next)
            setLikes((n) => n + (next ? 1 : -1))
            start(async () => {
              const r = await toggleReaction(post.id, next)
              if (!r.ok) {
                setLiked(!next)
                setLikes((n) => n + (next ? -1 : 1))
                toast.error(r.error)
              }
            })
          }}
        >
          <ThumbsUp className={cn(liked && "fill-primary/20")} /> {likes > 0 ? likes : ""} Helpful
        </Button>
        <Link href={href} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <MessageCircle className="size-3.5" /> {post.comment_count} {post.comment_count === 1 ? "reply" : "replies"}
        </Link>
        {post.type === "question" && post.accepted_comment_id && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="size-3.5" /> Answered
          </span>
        )}
      </footer>
      <ReportDialog open={reporting} onOpenChange={setReporting} targetType="post" targetId={post.id} communityId={post.community_id} snapshot={`${post.title}\n\n${post.body}`} />
    </article>
  )
}

function Poll({ postId, options, myVote }: { postId: string; options: NonNullable<PostData["poll_options"]>; myVote: string | null }) {
  const [vote, setVote] = useState(myVote)
  const [counts, setCounts] = useState(() => Object.fromEntries(options.map((o) => [o.id, o.vote_count])))
  const [pending, start] = useTransition()
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const sorted = [...options].sort((a, b) => a.position - b.position)
  return (
    <div className="mt-4 space-y-2">
      {sorted.map((o) => {
        const pct = total ? Math.round((counts[o.id] / total) * 100) : 0
        const chosen = vote === o.id
        return (
          <button
            key={o.id}
            type="button"
            disabled={pending}
            onClick={() => {
              if (chosen) return
              const prev = vote
              setVote(o.id)
              setCounts((c) => ({ ...c, [o.id]: c[o.id] + 1, ...(prev ? { [prev]: c[prev] - 1 } : {}) }))
              start(async () => {
                const r = await votePoll(postId, o.id)
                if (!r.ok) {
                  toast.error(r.error)
                  setVote(prev)
                  setCounts((c) => ({ ...c, [o.id]: c[o.id] - 1, ...(prev ? { [prev]: c[prev] + 1 } : {}) }))
                }
              })
            }}
            className={cn("relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition", chosen ? "border-primary/40" : "hover:border-primary/30")}
          >
            {vote && <span className={cn("absolute inset-y-0 left-0 transition-all", chosen ? "bg-primary/15" : "bg-muted")} style={{ width: `${pct}%` }} />}
            <span className="relative flex justify-between gap-2">
              <span className={cn(chosen && "font-medium")}>
                {o.label} {chosen && <CheckCircle2 className="ml-1 inline size-3.5 text-primary" />}
              </span>
              {vote && <span className="text-muted-foreground tabular-nums">{pct}%</span>}
            </span>
          </button>
        )
      })}
      <p className="text-xs text-muted-foreground">
        {total} {total === 1 ? "vote" : "votes"}
        {!vote && " · vote to see results"}
      </p>
    </div>
  )
}
