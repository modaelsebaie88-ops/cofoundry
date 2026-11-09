"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarCheck, Check, Loader2, Star, Video, X } from "lucide-react"
import { toast } from "sonner"
import { respondToRequest, reviewMentor } from "@/actions/mentorship"
import { toLocalInput } from "@/components/events/event-form"
import { Tag } from "@/components/shared/badges"
import { Field } from "@/components/shared/form"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Person = { id: string; full_name: string; avatar_url: string | null; headline: string | null }
export type RequestData = {
  id: string
  topic: string
  message: string
  preferred_times: string[]
  scheduled_at: string | null
  meeting_url: string | null
  mentor_note: string | null
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled"
  created_at: string
  mentor_id: string
  mentor: Person
  mentee: Person
  mentorship_reviews: { id: string }[] | { id: string } | null
}

const statusTone: Record<RequestData["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  completed: "bg-violet-50 text-violet-700",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
}

export function RequestCard({ request: r, asMentor }: { request: RequestData; asMentor: boolean }) {
  const other = asMentor ? r.mentee : r.mentor
  const [pending, start] = useTransition()
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const router = useRouter()
  const reviewed = Array.isArray(r.mentorship_reviews) ? r.mentorship_reviews.length > 0 : Boolean(r.mentorship_reviews)

  const act = (status: "declined" | "completed" | "cancelled") =>
    start(async () => {
      if (status !== "completed" && !confirm(`Mark this session as ${status}?`)) return
      const res = await respondToRequest(r.id, { status })
      res.ok ? (toast.success(res.message), router.refresh()) : toast.error(res.error)
    })

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Link href={`/founders/${other.id}`} className="flex min-w-0 flex-1 items-start gap-3">
          <UserAvatar name={other.full_name} src={other.avatar_url} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{asMentor ? "Request from" : "Mentor"}</p>
            <p className="font-medium">{other.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{other.headline}</p>
          </div>
        </Link>
        <span className={cn("self-start rounded-md px-2 py-0.5 text-xs font-semibold capitalize", statusTone[r.status])}>{r.status}</span>
      </div>
      <div className="mt-4 rounded-xl bg-muted/40 p-4">
        <p className="text-sm font-semibold">{r.topic}</p>
        <p className="mt-1 text-sm whitespace-pre-line text-foreground/80">{r.message}</p>
        {r.preferred_times.length > 0 && r.status === "pending" && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground">Preferred times:</span>
            {r.preferred_times.map((t) => (
              <Tag key={t}>{format(new Date(t), "EEE MMM d, p")}</Tag>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Requested <RelativeTime date={r.created_at} />
        </p>
      </div>
      {r.scheduled_at && (r.status === "accepted" || r.status === "completed") && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-sm">
          <CalendarCheck className="size-4 text-emerald-700" />
          <span className="font-medium">{format(new Date(r.scheduled_at), "EEEE, MMM d · p")}</span>
          {r.meeting_url && r.status === "accepted" && (
            <a href={r.meeting_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Video className="size-3.5" /> Meeting link
            </a>
          )}
          {r.mentor_note && <span className="w-full text-xs text-muted-foreground">Note: {r.mentor_note}</span>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {asMentor && r.status === "pending" && (
          <>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => act("declined")}>
              <X /> Decline
            </Button>
            <Button size="sm" disabled={pending} onClick={() => setAcceptOpen(true)}>
              <Check /> Accept & schedule
            </Button>
          </>
        )}
        {asMentor && r.status === "accepted" && (
          <>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => act("cancelled")}>
              Cancel session
            </Button>
            <Button size="sm" disabled={pending} onClick={() => act("completed")}>
              <Check /> Mark completed
            </Button>
          </>
        )}
        {!asMentor && (r.status === "pending" || r.status === "accepted") && (
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => act("cancelled")}>
            Cancel request
          </Button>
        )}
        {!asMentor && r.status === "completed" && !reviewed && (
          <Button size="sm" onClick={() => setReviewOpen(true)}>
            <Star /> Leave a review
          </Button>
        )}
        {!asMentor && r.status === "completed" && reviewed && <span className="text-xs text-muted-foreground">Reviewed — thank you!</span>}
      </div>
      {acceptOpen && <AcceptDialog request={r} onClose={() => setAcceptOpen(false)} />}
      {reviewOpen && <ReviewDialog requestId={r.id} mentorId={r.mentor_id} onClose={() => setReviewOpen(false)} />}
    </div>
  )
}

function AcceptDialog({ request: r, onClose }: { request: RequestData; onClose: () => void }) {
  const future = r.preferred_times.filter((t) => new Date(t) > new Date())
  const [time, setTime] = useState(future[0] ? toLocalInput(future[0]) : "")
  const [url, setUrl] = useState("")
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule the session</DialogTitle>
          <DialogDescription>Pick one of the proposed times or suggest your own.</DialogDescription>
        </DialogHeader>
        {future.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {future.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(toLocalInput(t))}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium", time === toLocalInput(t) ? "border-primary bg-accent text-accent-foreground" : "bg-white")}
              >
                {format(new Date(t), "EEE MMM d, p")}
              </button>
            ))}
          </div>
        )}
        <Field label="Session time">
          <Input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Meeting link (optional)">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.example.com/…" />
        </Field>
        <Field label="Note to mentee (optional)">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending || !time}
            onClick={() =>
              start(async () => {
                const res = await respondToRequest(r.id, { status: "accepted", scheduled_at: new Date(time).toISOString(), meeting_url: url, mentor_note: note })
                if (res.ok) {
                  toast.success("Session scheduled — the mentee has been notified")
                  onClose()
                  router.refresh()
                } else toast.error(res.error)
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Confirm session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewDialog({ requestId, mentorId, onClose }: { requestId: string; mentorId: string; onClose: () => void }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How was your session?</DialogTitle>
          <DialogDescription>Reviews help other founders find great mentors.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)}>
              <Star className={cn("size-7", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
            </button>
          ))}
        </div>
        <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="What was most helpful? (optional)" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending || !rating}
            onClick={() =>
              start(async () => {
                const res = await reviewMentor(requestId, mentorId, rating, comment)
                if (res.ok) {
                  toast.success(res.message)
                  onClose()
                  router.refresh()
                } else toast.error(res.error)
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
