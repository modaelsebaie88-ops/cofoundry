"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2, Search } from "lucide-react"
import { NativeSelect } from "@/components/shared/native-select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { COLLAB_TYPES, COLLAB_TYPE_KEYS, STAGES, STAGE_KEYS } from "@/lib/constants"

export function OpportunityFilters({ categories, total }: { categories: { id: number; name: string }[]; total: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const [q, setQ] = useState(params.get("q") ?? "")
  const update = (k: string, v: string | null) => {
    const next = new URLSearchParams(params.toString())
    if (v) next.set(k, v)
    else next.delete(k)
    next.delete("page")
    start(() => router.push(`${pathname}?${next}`, { scroll: false }))
  }
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault()
            update("q", q.trim() || null)
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opportunities" className="h-10 bg-white pl-9" aria-label="Search opportunities" />
        </form>
        <NativeSelect aria-label="Industry" value={params.get("industry") ?? ""} onChange={(e) => update("industry", e.target.value || null)} className="lg:w-44">
          <option value="">All industries</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Stage" value={params.get("stage") ?? ""} onChange={(e) => update("stage", e.target.value || null)} className="lg:w-36">
          <option value="">Any stage</option>
          {STAGE_KEYS.map((s) => (
            <option key={s} value={s}>
              {STAGES[s].label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Collaboration type" value={params.get("collab") ?? ""} onChange={(e) => update("collab", e.target.value || null)} className="lg:w-44">
          <option value="">Any collaboration</option>
          {COLLAB_TYPE_KEYS.map((c) => (
            <option key={c} value={c}>
              {COLLAB_TYPES[c]}
            </option>
          ))}
        </NativeSelect>
        <label className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm">
          <Switch checked={params.get("remote") === "1"} onCheckedChange={(c) => update("remote", c ? "1" : null)} /> Remote only
        </label>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        {total} open {total === 1 ? "opportunity" : "opportunities"}
      </p>
    </div>
  )
}
