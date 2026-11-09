"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveMentorProfile } from "@/actions/mentorship"
import { ChipSelect, Field } from "@/components/shared/form"
import { TagInput } from "@/components/shared/tag-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { STAGES, STAGE_KEYS, type StartupStage } from "@/lib/constants"

type Values = {
  expertise: string[]
  focus_stages: StartupStage[]
  about: string
  availability_note: string
  session_minutes: number
  sessions_per_month: number
  is_accepting: boolean
}

export function MentorProfileForm({ initial, isNew }: { initial: Values; isNew: boolean }) {
  const [v, setV] = useState(initial)
  const [fe, setFe] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()
  const router = useRouter()
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }))
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await saveMentorProfile(v)
          if (r.ok) {
            toast.success(r.message)
            router.push("/mentorship?tab=requests")
            router.refresh()
          } else {
            toast.error(r.error)
            setFe(r.fieldErrors ?? {})
          }
        })
      }}
    >
      <Field label="Areas of expertise" required error={fe.expertise} hint="e.g. Fundraising, B2B pricing, Hiring engineers">
        <TagInput value={v.expertise} onChange={(x) => set("expertise", x)} max={15} />
      </Field>
      <Field label="About your mentorship" required error={fe.about}>
        <Textarea rows={5} value={v.about} onChange={(e) => set("about", e.target.value)} maxLength={3000} placeholder="Your background, what you're great at helping with, and how you like to run sessions." />
      </Field>
      <Field label="Best for startups at these stages">
        <ChipSelect options={STAGE_KEYS.map((s) => ({ value: s, label: STAGES[s].label }))} value={v.focus_stages} onChange={(x) => set("focus_stages", x)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Session length (minutes)" error={fe.session_minutes}>
          <Input type="number" min={15} max={180} step={15} value={v.session_minutes} onChange={(e) => set("session_minutes", Number(e.target.value))} className="h-10" />
        </Field>
        <Field label="Max sessions / month" error={fe.sessions_per_month}>
          <Input type="number" min={1} max={60} value={v.sessions_per_month} onChange={(e) => set("sessions_per_month", Number(e.target.value))} className="h-10" />
        </Field>
        <Field label="Availability note">
          <Input value={v.availability_note} onChange={(e) => set("availability_note", e.target.value)} maxLength={300} className="h-10" placeholder="e.g. Tue/Thu afternoons CET" />
        </Field>
      </div>
      <label className="flex items-center justify-between rounded-xl border bg-white p-4">
        <span>
          <span className="block text-sm font-medium">Accepting new requests</span>
          <span className="text-xs text-muted-foreground">Turn off to pause requests without hiding your profile.</span>
        </span>
        <Switch checked={v.is_accepting} onCheckedChange={(c) => set("is_accepting", c)} />
      </label>
      <div className="flex justify-end border-t pt-5">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} {isNew ? "Publish mentor profile" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
