"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LayoutGrid, List, Loader2, Search, SlidersHorizontal, X } from "lucide-react"
import { ChipSelect, Field } from "@/components/shared/form"
import { NativeSelect } from "@/components/shared/native-select"
import { TagInput } from "@/components/shared/tag-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { CAPABILITIES, CAPABILITY_KEYS, COLLAB_TYPES, COLLAB_TYPE_KEYS, FOUNDER_ROLES, STAGES, STAGE_KEYS } from "@/lib/constants"
import { COUNTRIES } from "@/lib/countries"
import { cn } from "@/lib/utils"

const ADVANCED = ["skills", "city", "role", "exp", "collab", "offers", "needs", "cofounder"]

export function DirectoryFilters({
  categories,
  skillSuggestions,
  total,
  view,
}: {
  categories: { id: number; name: string }[]
  skillSuggestions: string[]
  total: number
  view: "grid" | "list"
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const urlQ = params.get("q") ?? ""
  const [q, setQ] = useState(urlQ)
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ)
  const [open, setOpen] = useState(false)
  if (prevUrlQ !== urlQ) {
    setPrevUrlQ(urlQ)
    setQ(urlQ)
  }

  const update = (patch: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || (Array.isArray(v) && !v.length)) next.delete(k)
      else next.set(k, Array.isArray(v) ? v.join(",") : v)
    }
    if (!("page" in patch)) next.delete("page")
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }))
  }
  const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean)
  const advancedCount = ADVANCED.filter((k) => params.get(k)).length
  const anyFilter = ["q", "industry", "stage", "country", ...ADVANCED].some((k) => params.get(k))

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            update({ q: q.trim() || null })
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, headline or bio" className="h-10 bg-white pl-9" aria-label="Search founders" />
        </form>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          <NativeSelect aria-label="Industry" value={params.get("industry") ?? ""} onChange={(e) => update({ industry: e.target.value || null })} className="lg:w-44">
            <option value="">All industries</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Startup stage" value={params.get("stage") ?? ""} onChange={(e) => update({ stage: e.target.value || null })} className="lg:w-36">
            <option value="">Any stage</option>
            {STAGE_KEYS.map((s) => (
              <option key={s} value={s}>
                {STAGES[s].label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Country" value={params.get("country") ?? ""} onChange={(e) => update({ country: e.target.value || null })} className="lg:w-40">
            <option value="">Any country</option>
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" className="h-10 bg-white" />}>
              <SlidersHorizontal /> More filters
              {advancedCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-white">{advancedCount}</span>}
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>More filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-8">
                <Field label="Skills" hint="Founders with any of these skills">
                  <TagInput value={list("skills")} onChange={(v) => update({ skills: v })} suggestions={skillSuggestions} allowCustom={false} placeholder="Type a skill" />
                </Field>
                <Field label="City">
                  <Input
                    defaultValue={params.get("city") ?? ""}
                    onBlur={(e) => update({ city: e.target.value.trim() || null })}
                    onKeyDown={(e) => e.key === "Enter" && update({ city: (e.target as HTMLInputElement).value.trim() || null })}
                    className="h-10"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Founder role">
                    <NativeSelect value={params.get("role") ?? ""} onChange={(e) => update({ role: e.target.value || null })}>
                      <option value="">Any role</option>
                      {FOUNDER_ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="Experience">
                    <NativeSelect value={params.get("exp") ?? ""} onChange={(e) => update({ exp: e.target.value || null })}>
                      <option value="">Any</option>
                      {[2, 5, 10, 15].map((y) => (
                        <option key={y} value={y}>
                          {y}+ years
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <label className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-sm font-medium">Looking for a co-founder</span>
                  <Switch checked={params.get("cofounder") === "1"} onCheckedChange={(c) => update({ cofounder: c ? "1" : null })} />
                </label>
                <Field label="They offer">
                  <ChipSelect options={CAPABILITY_KEYS.map((c) => ({ value: c, label: CAPABILITIES[c].label }))} value={list("offers")} onChange={(v) => update({ offers: v })} />
                </Field>
                <Field label="They need">
                  <ChipSelect options={CAPABILITY_KEYS.map((c) => ({ value: c, label: CAPABILITIES[c].label }))} value={list("needs")} onChange={(v) => update({ needs: v })} />
                </Field>
                <Field label="Collaboration interests">
                  <ChipSelect options={COLLAB_TYPE_KEYS.map((c) => ({ value: c, label: COLLAB_TYPES[c] }))} value={list("collab")} onChange={(v) => update({ collab: v })} />
                </Field>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {total.toLocaleString()} {total === 1 ? "founder" : "founders"}
          {anyFilter && (
            <button type="button" onClick={() => start(() => router.push(pathname))} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <X className="size-3" /> Clear filters
            </button>
          )}
        </p>
        <div className="flex rounded-lg border bg-white p-0.5" role="group" aria-label="View">
          {(["grid", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              aria-label={`${v} view`}
              onClick={() => update({ view: v === "grid" ? null : "list", page: params.get("page") })}
              className={cn("rounded-md p-1.5", view === v ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              {v === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
