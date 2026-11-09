"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveCollaboration, saveFounder, savePersonal, saveStartup } from "@/actions/profile"
import { ChipSelect, Field, FormError } from "@/components/shared/form"
import { ImageUpload } from "@/components/shared/image-upload"
import { NativeSelect } from "@/components/shared/native-select"
import { TagInput } from "@/components/shared/tag-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  AVAILABILITY,
  AVAILABILITY_KEYS,
  CAPABILITIES,
  CAPABILITY_KEYS,
  COLLAB_TYPES,
  COLLAB_TYPE_KEYS,
  FOUNDER_ROLES,
  STAGES,
  STAGE_KEYS,
  type Availability,
  type Capability,
  type CollabType,
  type StartupStage,
} from "@/lib/constants"
import { COUNTRIES } from "@/lib/countries"
import type { ActionResult } from "@/lib/auth"

type Category = { id: number; name: string }

type FormFooterProps = {
  submitLabel?: string
  onSuccess?: () => void
  secondary?: React.ReactNode
}

function useSubmit(onSuccess?: () => void, successMessage = "Saved") {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  function submit(fn: () => Promise<ActionResult<unknown>>) {
    start(async () => {
      const r = await fn()
      if (r.ok) {
        setError(null)
        setFieldErrors({})
        if (onSuccess) onSuccess()
        else toast.success(successMessage)
      } else {
        setError(r.error)
        setFieldErrors(r.fieldErrors ?? {})
        toast.error(r.error)
      }
    })
  }
  return { pending, error, fieldErrors, submit }
}

function Footer({ pending, submitLabel = "Save changes", secondary }: { pending: boolean } & FormFooterProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-t pt-5">
      <div>{secondary}</div>
      <Button type="submit" size="lg" disabled={pending} className="min-w-28">
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
export type PersonalValues = {
  full_name: string
  avatar_url: string | null
  headline: string | null
  country: string | null
  city: string | null
  linkedin_url: string | null
  website_url: string | null
  bio: string | null
}

export function PersonalForm({ initial, ...footer }: { initial: PersonalValues } & FormFooterProps) {
  const [v, setV] = useState(initial)
  const { pending, error, fieldErrors: fe, submit } = useSubmit(footer.onSuccess)
  const set = <K extends keyof PersonalValues>(k: K, val: PersonalValues[K]) => setV((s) => ({ ...s, [k]: val }))
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit(() => savePersonal(v))
      }}
    >
      <FormError message={error} />
      <Field label="Profile photo">
        <ImageUpload bucket="avatars" value={v.avatar_url} onChange={(u) => set("avatar_url", u)} fallbackName={v.full_name} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="full_name" error={fe.full_name} required>
          <Input id="full_name" value={v.full_name} onChange={(e) => set("full_name", e.target.value)} className="h-10" />
        </Field>
        <Field label="Professional headline" htmlFor="headline" error={fe.headline} required hint="e.g. “Founder at Lumen · ex-clinic operator”">
          <Input id="headline" value={v.headline ?? ""} onChange={(e) => set("headline", e.target.value)} className="h-10" maxLength={160} />
        </Field>
        <Field label="Country" htmlFor="country" error={fe.country} required>
          <NativeSelect id="country" value={v.country ?? ""} onChange={(e) => set("country", e.target.value)}>
            <option value="" disabled>
              Select a country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="City" htmlFor="city" error={fe.city}>
          <Input id="city" value={v.city ?? ""} onChange={(e) => set("city", e.target.value)} className="h-10" />
        </Field>
        <Field label="LinkedIn profile" htmlFor="linkedin" error={fe.linkedin_url}>
          <Input id="linkedin" value={v.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="linkedin.com/in/you" className="h-10" />
        </Field>
        <Field label="Website or portfolio" htmlFor="website" error={fe.website_url}>
          <Input id="website" value={v.website_url ?? ""} onChange={(e) => set("website_url", e.target.value)} placeholder="yoursite.com" className="h-10" />
        </Field>
      </div>
      <Field label="Short professional bio" htmlFor="bio" error={fe.bio} hint={`${(v.bio ?? "").length}/2000`}>
        <Textarea
          id="bio"
          rows={4}
          value={v.bio ?? ""}
          onChange={(e) => set("bio", e.target.value)}
          maxLength={2000}
          placeholder="What have you worked on, what are you building now and what drives you?"
        />
      </Field>
      <Footer pending={pending} {...footer} />
    </form>
  )
}

// ---------------------------------------------------------------------------
export type StartupValues = {
  name: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null
  category_id: number | null
  stage: StartupStage
  website_url: string | null
  target_market: string | null
  business_model: string | null
  team_size: number | null
  mission: string | null
  vision: string | null
  products: string | null
  current_needs: Capability[]
  location: string | null
  founded_year: number | null
  twitter_url: string | null
  linkedin_url: string | null
}

export const emptyStartup: StartupValues = {
  name: "", tagline: null, description: null, logo_url: null, cover_url: null, category_id: null, stage: "idea",
  website_url: null, target_market: null, business_model: null, team_size: 1, mission: null, vision: null,
  products: null, current_needs: [], location: null, founded_year: null, twitter_url: null, linkedin_url: null,
}

export function StartupForm({
  initial,
  categories,
  extended,
  ...footer
}: { initial: StartupValues; categories: Category[]; extended?: boolean } & FormFooterProps) {
  const [v, setV] = useState(initial)
  const { pending, error, fieldErrors: fe, submit } = useSubmit(footer.onSuccess, "Startup saved")
  const set = <K extends keyof StartupValues>(k: K, val: StartupValues[K]) => setV((s) => ({ ...s, [k]: val }))
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit(() => saveStartup(v))
      }}
    >
      <FormError message={error} />
      <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <Field label="Logo">
          <ImageUpload bucket="startup-assets" shape="rounded" label="Upload logo" value={v.logo_url} onChange={(u) => set("logo_url", u)} fallbackName={v.name} />
        </Field>
        {extended && (
          <Field label="Cover image" hint="Wide image shown on your public startup page">
            <ImageUpload bucket="startup-assets" shape="banner" label="Upload cover" value={v.cover_url} onChange={(u) => set("cover_url", u)} />
          </Field>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Startup name" htmlFor="s_name" error={fe.name} required>
          <Input id="s_name" value={v.name} onChange={(e) => set("name", e.target.value)} className="h-10" />
        </Field>
        <Field label="One-line tagline" htmlFor="tagline" error={fe.tagline}>
          <Input id="tagline" value={v.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} className="h-10" maxLength={160} placeholder="What you do, in one sentence" />
        </Field>
        <Field label="Industry" htmlFor="category" error={fe.category_id} required>
          <NativeSelect id="category" value={v.category_id ?? ""} onChange={(e) => set("category_id", Number(e.target.value) || null)}>
            <option value="" disabled>
              Select an industry
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Website" htmlFor="s_web" error={fe.website_url}>
          <Input id="s_web" value={v.website_url ?? ""} onChange={(e) => set("website_url", e.target.value)} className="h-10" placeholder="yourstartup.com" />
        </Field>
      </div>
      <Field label="Development stage" required error={fe.stage}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STAGE_KEYS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("stage", s)}
              aria-pressed={v.stage === s}
              className={`rounded-xl border p-3 text-left transition ${v.stage === s ? "border-primary bg-accent ring-2 ring-primary/20" : "bg-white hover:border-primary/30"}`}
            >
              <span className="block text-sm font-semibold">{STAGES[s].label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{STAGES[s].description}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Description" htmlFor="desc" error={fe.description} required hint="What problem you solve, for whom, and how.">
        <Textarea id="desc" rows={4} value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Target market" htmlFor="market" error={fe.target_market}>
          <Input id="market" value={v.target_market ?? ""} onChange={(e) => set("target_market", e.target.value)} className="h-10" />
        </Field>
        <Field label="Business model" htmlFor="model" error={fe.business_model}>
          <Input id="model" value={v.business_model ?? ""} onChange={(e) => set("business_model", e.target.value)} className="h-10" placeholder="e.g. B2B SaaS" />
        </Field>
        <Field label="Team size" htmlFor="team" error={fe.team_size}>
          <Input id="team" type="number" min={1} value={v.team_size ?? ""} onChange={(e) => set("team_size", e.target.value ? Number(e.target.value) : null)} className="h-10" />
        </Field>
      </div>
      <Field label="What does your startup need right now?" hint="Used to match you with founders who can help.">
        <ChipSelect
          options={CAPABILITY_KEYS.map((c) => ({ value: c, label: CAPABILITIES[c].label }))}
          value={v.current_needs}
          onChange={(x) => set("current_needs", x)}
          max={8}
        />
      </Field>
      {extended && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Mission" htmlFor="mission" error={fe.mission}>
              <Textarea id="mission" rows={3} value={v.mission ?? ""} onChange={(e) => set("mission", e.target.value)} maxLength={1000} />
            </Field>
            <Field label="Vision" htmlFor="vision" error={fe.vision}>
              <Textarea id="vision" rows={3} value={v.vision ?? ""} onChange={(e) => set("vision", e.target.value)} maxLength={1000} />
            </Field>
          </div>
          <Field label="Products & services" htmlFor="products" error={fe.products}>
            <Textarea id="products" rows={3} value={v.products ?? ""} onChange={(e) => set("products", e.target.value)} maxLength={3000} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Location" htmlFor="loc" error={fe.location}>
              <Input id="loc" value={v.location ?? ""} onChange={(e) => set("location", e.target.value)} className="h-10" />
            </Field>
            <Field label="Founded" htmlFor="founded" error={fe.founded_year}>
              <Input id="founded" type="number" min={1950} max={2100} value={v.founded_year ?? ""} onChange={(e) => set("founded_year", e.target.value ? Number(e.target.value) : null)} className="h-10" />
            </Field>
            <Field label="LinkedIn page" htmlFor="s_li" error={fe.linkedin_url}>
              <Input id="s_li" value={v.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} className="h-10" />
            </Field>
            <Field label="X / Twitter" htmlFor="s_tw" error={fe.twitter_url}>
              <Input id="s_tw" value={v.twitter_url ?? ""} onChange={(e) => set("twitter_url", e.target.value)} className="h-10" />
            </Field>
          </div>
        </>
      )}
      <Footer pending={pending} {...footer} />
    </form>
  )
}

// ---------------------------------------------------------------------------
export type FounderValues = {
  founder_role: string | null
  years_experience: number | null
  previous_experience: string | null
  help_topics: string[]
  skills: string[]
  learning: string[]
  interests: number[]
}

export function FounderForm({
  initial,
  categories,
  skillSuggestions,
  ...footer
}: { initial: FounderValues; categories: Category[]; skillSuggestions: string[] } & FormFooterProps) {
  const [v, setV] = useState(initial)
  const { pending, error, fieldErrors: fe, submit } = useSubmit(footer.onSuccess)
  const set = <K extends keyof FounderValues>(k: K, val: FounderValues[K]) => setV((s) => ({ ...s, [k]: val }))
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit(() => saveFounder(v))
      }}
    >
      <FormError message={error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your role" htmlFor="frole" error={fe.founder_role} required>
          <NativeSelect id="frole" value={v.founder_role ?? ""} onChange={(e) => set("founder_role", e.target.value)}>
            <option value="" disabled>
              Select your role
            </option>
            {FOUNDER_ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Years of professional experience" htmlFor="years" error={fe.years_experience} required>
          <Input id="years" type="number" min={0} max={60} value={v.years_experience ?? ""} onChange={(e) => set("years_experience", e.target.value === "" ? null : Number(e.target.value))} className="h-10" />
        </Field>
      </div>
      <Field label="Skills & expertise" htmlFor="skills" error={fe.skills} required hint="Pick from suggestions or add your own." className="scroll-mt-24" >
        <span id="skills-anchor" />
        <TagInput id="skills" value={v.skills} onChange={(x) => set("skills", x)} suggestions={skillSuggestions} placeholder="e.g. Product design, Python, B2B sales" invalid={Boolean(fe.skills)} />
      </Field>
      <Field label="Skills you want to learn" htmlFor="learning" hint="Powers skill-exchange matches.">
        <TagInput id="learning" value={v.learning} onChange={(x) => set("learning", x)} suggestions={skillSuggestions} max={10} />
      </Field>
      <Field label="Industries you're interested in" error={fe.interests} required>
        <ChipSelect options={categories.map((c) => ({ value: String(c.id), label: c.name }))} value={v.interests.map(String)} onChange={(x) => set("interests", x.map(Number))} max={8} />
      </Field>
      <Field label="Topics you can help others with" htmlFor="help" hint="e.g. “Pricing”, “Hiring engineers”, “Seed fundraising”">
        <TagInput id="help" value={v.help_topics} onChange={(x) => set("help_topics", x)} max={10} placeholder="Add a topic and press Enter" />
      </Field>
      <Field label="Previous experience" htmlFor="prev" error={fe.previous_experience}>
        <Textarea id="prev" rows={4} value={v.previous_experience ?? ""} onChange={(e) => set("previous_experience", e.target.value)} maxLength={2000} placeholder="Companies, roles, launches, exits — whatever's most relevant." />
      </Field>
      <Footer pending={pending} {...footer} />
    </form>
  )
}

// ---------------------------------------------------------------------------
export type CollaborationValues = {
  looking_for: Capability[]
  offers: Capability[]
  seeking_cofounder: boolean
  open_to_partnerships: boolean
  collaboration_types: CollabType[]
  availability: Availability | null
}

export function CollaborationForm({
  initial,
  completeOnboarding,
  ...footer
}: { initial: CollaborationValues; completeOnboarding?: boolean } & FormFooterProps) {
  const [v, setV] = useState(initial)
  const { pending, error, fieldErrors: fe, submit } = useSubmit(footer.onSuccess)
  const set = <K extends keyof CollaborationValues>(k: K, val: CollaborationValues[K]) => setV((s) => ({ ...s, [k]: val }))
  const capOptions = CAPABILITY_KEYS.map((c) => ({ value: c, label: CAPABILITIES[c].label }))
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        submit(() => saveCollaboration(v, { completeOnboarding }))
      }}
    >
      <FormError message={error} />
      <Field label="What are you looking for?" hint="The expertise or people you need. This drives your recommendations." error={fe.looking_for}>
        <ChipSelect options={capOptions} value={v.looking_for} onChange={(x) => set("looking_for", x)} max={8} />
      </Field>
      <Field label="What can you offer?" required error={fe.offers}>
        <ChipSelect options={capOptions} value={v.offers} onChange={(x) => set("offers", x)} max={8} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border bg-white p-4">
          <span>
            <span className="block text-sm font-medium">Looking for a co-founder</span>
            <span className="block text-xs text-muted-foreground">Show up in co-founder searches and matches.</span>
          </span>
          <Switch checked={v.seeking_cofounder} onCheckedChange={(c) => set("seeking_cofounder", c)} />
        </label>
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border bg-white p-4">
          <span>
            <span className="block text-sm font-medium">Open to partnerships</span>
            <span className="block text-xs text-muted-foreground">Business, distribution or product partnerships.</span>
          </span>
          <Switch checked={v.open_to_partnerships} onCheckedChange={(c) => set("open_to_partnerships", c)} />
        </label>
      </div>
      <Field label="Preferred collaboration types">
        <ChipSelect options={COLLAB_TYPE_KEYS.map((c) => ({ value: c, label: COLLAB_TYPES[c] }))} value={v.collaboration_types} onChange={(x) => set("collaboration_types", x)} />
      </Field>
      <Field label="Availability" required error={fe.availability}>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY_KEYS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={v.availability === a}
              onClick={() => set("availability", a)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${v.availability === a ? "border-primary/30 bg-primary text-primary-foreground" : "bg-white hover:border-primary/30 hover:bg-accent"}`}
            >
              {AVAILABILITY[a]}
            </button>
          ))}
        </div>
      </Field>
      <Footer pending={pending} {...footer} />
    </form>
  )
}
