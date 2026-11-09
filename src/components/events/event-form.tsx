"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveEvent } from "@/actions/events"
import { Field, FormError } from "@/components/shared/form"
import { NativeSelect } from "@/components/shared/native-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { EVENT_TYPES, EVENT_TYPE_KEYS, type EventType } from "@/lib/constants"

export type EventValues = {
  title: string
  description: string
  type: EventType | ""
  starts_at: string
  ends_at: string
  is_online: boolean
  location: string | null
  meeting_url: string | null
  capacity: number | null
  community_id: string | null
}

/** Converts an ISO timestamp to the value format of <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventForm({ id, initial, communities }: { id: string | null; initial: EventValues; communities: { id: string; name: string }[] }) {
  const [v, setV] = useState(initial)
  const [fe, setFe] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  const set = <K extends keyof EventValues>(k: K, val: EventValues[K]) => setV((s) => ({ ...s, [k]: val }))

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          // datetime-local values are in the browser's time zone; send absolute ISO timestamps.
          const payload = { ...v, starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : "", ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : "" }
          const r = await saveEvent(id, payload)
          if (r.ok && r.data) {
            toast.success(id ? "Event updated" : "Event published")
            router.push(`/events/${r.data.id}`)
            router.refresh()
          } else if (!r.ok) {
            setError(r.error)
            setFe(r.fieldErrors ?? {})
          }
        })
      }}
    >
      <FormError message={error} />
      <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
        <Field label="Event title" required error={fe.title}>
          <Input value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={140} className="h-10" />
        </Field>
        <Field label="Type" required error={fe.type}>
          <NativeSelect value={v.type} onChange={(e) => set("type", e.target.value as EventType)}>
            <option value="" disabled>
              Select
            </option>
            {EVENT_TYPE_KEYS.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPES[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Description" required error={fe.description} hint="Agenda, speakers, who should attend.">
        <Textarea rows={5} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={6000} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts" required error={fe.starts_at}>
          <Input type="datetime-local" value={v.starts_at} onChange={(e) => set("starts_at", e.target.value)} className="h-10" />
        </Field>
        <Field label="Ends" required error={fe.ends_at}>
          <Input type="datetime-local" value={v.ends_at} onChange={(e) => set("ends_at", e.target.value)} className="h-10" />
        </Field>
      </div>
      <label className="flex items-center justify-between rounded-xl border bg-white p-4">
        <span className="text-sm font-medium">Online event</span>
        <Switch checked={v.is_online} onCheckedChange={(c) => set("is_online", c)} />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        {v.is_online ? (
          <Field label="Meeting link" error={fe.meeting_url} hint="Only shown to registered attendees.">
            <Input value={v.meeting_url ?? ""} onChange={(e) => set("meeting_url", e.target.value)} className="h-10" placeholder="https://…" />
          </Field>
        ) : (
          <Field label="Location" required error={fe.location}>
            <Input value={v.location ?? ""} onChange={(e) => set("location", e.target.value)} className="h-10" placeholder="Venue, city" />
          </Field>
        )}
        <Field label="Capacity" error={fe.capacity} hint="Leave empty for unlimited">
          <Input type="number" min={1} value={v.capacity ?? ""} onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : null)} className="h-10" />
        </Field>
      </div>
      {communities.length > 0 && (
        <Field label="Community (optional)" hint="Shown on that community's Events tab.">
          <NativeSelect value={v.community_id ?? ""} onChange={(e) => set("community_id", e.target.value || null)}>
            <option value="">No community — platform-wide</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <div className="flex justify-end gap-2 border-t pt-5">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} {id ? "Save changes" : "Publish event"}
        </Button>
      </div>
    </form>
  )
}
