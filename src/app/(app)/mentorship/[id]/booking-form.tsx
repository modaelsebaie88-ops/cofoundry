"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { requestSession } from "@/actions/mentorship"
import { Field } from "@/components/shared/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function BookingForm({ mentorId, mentorName }: { mentorId: string; mentorName: string }) {
  const [topic, setTopic] = useState("")
  const [message, setMessage] = useState("")
  const [times, setTimes] = useState<string[]>([""])
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await requestSession({
            mentor_id: mentorId,
            topic,
            message,
            preferred_times: times.filter(Boolean).map((t) => new Date(t).toISOString()),
          })
          if (r.ok) {
            toast.success(r.message)
            router.push("/mentorship?tab=sessions")
          } else toast.error(r.error)
        })
      }}
    >
      <div>
        <p className="font-semibold">Request a session</p>
        <p className="text-xs text-muted-foreground">{mentorName.split(" ")[0]} will confirm a time.</p>
      </div>
      <Field label="Topic" required>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={140} placeholder="e.g. Preparing for our pre-seed raise" />
      </Field>
      <Field label="Context" required>
        <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} placeholder="Where you are, what you've tried and what you'd like to get out of the session." />
      </Field>
      <Field label="Preferred times (up to 3)" hint="In your local time zone">
        <div className="space-y-2">
          {times.map((t, i) => (
            <div key={i} className="flex gap-2">
              <Input type="datetime-local" value={t} onChange={(e) => setTimes((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Preferred time ${i + 1}`} />
              {times.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setTimes((xs) => xs.filter((_, j) => j !== i))} aria-label="Remove time">
                  <X />
                </Button>
              )}
            </div>
          ))}
          {times.length < 3 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setTimes((xs) => [...xs, ""])}>
              <Plus /> Add another time
            </Button>
          )}
        </div>
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={pending || topic.trim().length < 3 || message.trim().length < 10}>
        {pending && <Loader2 className="animate-spin" />} Send request
      </Button>
    </form>
  )
}
