"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveOpportunity } from "@/actions/opportunities"
import { Field, FormError } from "@/components/shared/form"
import { NativeSelect } from "@/components/shared/native-select"
import { TagInput } from "@/components/shared/tag-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  COLLAB_TYPES,
  COLLAB_TYPE_KEYS,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_KEYS,
  STAGES,
  STAGE_KEYS,
  type CollabType,
  type OpportunityType,
  type StartupStage,
} from "@/lib/constants"

export type OpportunityValues = {
  type: OpportunityType | ""
  title: string
  description: string
  required_skills: string[]
  category_id: number | null
  stage: StartupStage | null
  collaboration_type: CollabType | ""
  requirements: string | null
  location: string | null
  is_remote: boolean
  attach_startup: boolean
}

export function OpportunityForm({
  id,
  initial,
  categories,
  skillSuggestions,
  startupName,
}: {
  id: string | null
  initial: OpportunityValues
  categories: { id: number; name: string }[]
  skillSuggestions: string[]
  startupName: string | null
}) {
  const [v, setV] = useState(initial)
  const [fe, setFe] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  const set = <K extends keyof OpportunityValues>(k: K, val: OpportunityValues[K]) => setV((s) => ({ ...s, [k]: val }))

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await saveOpportunity(id, v)
          if (r.ok && r.data) {
            toast.success(id ? "Opportunity updated" : "Opportunity published")
            router.push(`/opportunities/${r.data.id}`)
            router.refresh()
          } else if (!r.ok) {
            setError(r.error)
            setFe(r.fieldErrors ?? {})
          }
        })
      }}
    >
      <FormError message={error} />
      <Field label="Category" required error={fe.type}>
        <NativeSelect value={v.type} onChange={(e) => set("type", e.target.value as OpportunityType)}>
          <option value="" disabled>
            What kind of opportunity is this?
          </option>
          {OPPORTUNITY_TYPE_KEYS.map((t) => (
            <option key={t} value={t}>
              {OPPORTUNITY_TYPES[t].label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Title" htmlFor="o_title" required error={fe.title}>
        <Input id="o_title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={140} className="h-10" placeholder="e.g. Technical co-founder for an AI healthcare startup" />
      </Field>
      <Field label="Description" htmlFor="o_desc" required error={fe.description} hint="What you're building, what this person would own, and why now.">
        <Textarea id="o_desc" rows={6} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={6000} />
      </Field>
      <Field label="Required skills" error={fe.required_skills}>
        <TagInput value={v.required_skills} onChange={(x) => set("required_skills", x)} suggestions={skillSuggestions} max={12} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Collaboration type" required error={fe.collaboration_type}>
          <NativeSelect value={v.collaboration_type} onChange={(e) => set("collaboration_type", e.target.value as CollabType)}>
            <option value="" disabled>
              Select
            </option>
            {COLLAB_TYPE_KEYS.map((c) => (
              <option key={c} value={c}>
                {COLLAB_TYPES[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Industry">
          <NativeSelect value={v.category_id ?? ""} onChange={(e) => set("category_id", Number(e.target.value) || null)}>
            <option value="">Any / not specific</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Startup stage">
          <NativeSelect value={v.stage ?? ""} onChange={(e) => set("stage", (e.target.value || null) as StartupStage | null)}>
            <option value="">Not specified</option>
            {STAGE_KEYS.map((s) => (
              <option key={s} value={s}>
                {STAGES[s].label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Requirements" htmlFor="o_req" error={fe.requirements} hint="Experience, commitment, compensation or equity range.">
        <Textarea id="o_req" rows={3} value={v.requirements ?? ""} onChange={(e) => set("requirements", e.target.value)} maxLength={3000} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-xl border bg-white p-4">
          <span className="text-sm font-medium">Remote-friendly</span>
          <Switch checked={v.is_remote} onCheckedChange={(c) => set("is_remote", c)} />
        </label>
        <Field label="Location" error={fe.location}>
          <Input value={v.location ?? ""} onChange={(e) => set("location", e.target.value)} className="h-10" placeholder={v.is_remote ? "Optional — e.g. US time zones" : "City, country"} />
        </Field>
      </div>
      {startupName && (
        <label className="flex items-center justify-between rounded-xl border bg-white p-4">
          <span className="text-sm">
            <span className="block font-medium">Post on behalf of {startupName}</span>
            <span className="text-xs text-muted-foreground">Shows your startup&apos;s logo and links to its profile.</span>
          </span>
          <Switch checked={v.attach_startup} onCheckedChange={(c) => set("attach_startup", c)} />
        </label>
      )}
      <div className="flex justify-end gap-2 border-t pt-5">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} {id ? "Save changes" : "Publish opportunity"}
        </Button>
      </div>
    </form>
  )
}
