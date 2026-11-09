"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { deleteResource, saveResource } from "@/actions/admin"
import { Field } from "@/components/shared/form"
import { NativeSelect } from "@/components/shared/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_KEYS, type ResourceCategory } from "@/lib/constants"

type R = {
  id: string
  title: string
  summary: string
  body: string
  category: ResourceCategory
  kind: "guide" | "template" | "checklist" | "tool" | "story"
  external_url: string
  read_minutes: number | null
  is_featured: boolean
  is_published: boolean
}

const EMPTY: Omit<R, "id"> = { title: "", summary: "", body: "", category: "guides", kind: "guide", external_url: "", read_minutes: 5, is_featured: false, is_published: true }

export function ResourceEditor({ resource }: { resource: R | null }) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Omit<R, "id">>(resource ?? EMPTY)
  const [pending, start] = useTransition()
  const router = useRouter()
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }))
  return (
    <>
      <Button size="sm" variant={resource ? "ghost" : "default"} onClick={() => setOpen(true)} aria-label={resource ? `Edit ${resource.title}` : undefined}>
        {resource ? <Pencil /> : <Plus />} {resource ? "" : "New resource"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{resource ? "Edit resource" : "New resource"}</DialogTitle>
          </DialogHeader>
          <Field label="Title">
            <Input value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={160} />
          </Field>
          <Field label="Summary">
            <Textarea rows={2} value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={400} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Category">
              <NativeSelect value={v.category} onChange={(e) => set("category", e.target.value as ResourceCategory)}>
                {RESOURCE_CATEGORY_KEYS.map((c) => (
                  <option key={c} value={c}>
                    {RESOURCE_CATEGORIES[c]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Type">
              <NativeSelect value={v.kind} onChange={(e) => set("kind", e.target.value as R["kind"])}>
                {["guide", "template", "checklist", "tool", "story"].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Read time (min)">
              <Input type="number" min={1} max={120} value={v.read_minutes ?? ""} onChange={(e) => set("read_minutes", e.target.value ? Number(e.target.value) : null)} className="h-10" />
            </Field>
          </div>
          <Field label="Body (Markdown)">
            <Textarea rows={12} value={v.body} onChange={(e) => set("body", e.target.value)} maxLength={30000} className="font-mono text-xs" />
          </Field>
          <Field label="External link (optional)">
            <Input value={v.external_url} onChange={(e) => set("external_url", e.target.value)} placeholder="https://…" />
          </Field>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={v.is_published} onCheckedChange={(c) => set("is_published", c)} /> Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={v.is_featured} onCheckedChange={(c) => set("is_featured", c)} /> Featured
            </label>
          </div>
          <DialogFooter className="sm:justify-between">
            {resource ? (
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  confirm("Delete this resource?") &&
                  start(async () => {
                    const r = await deleteResource(resource.id)
                    r.ok ? (toast.success(r.message), setOpen(false), router.refresh()) : toast.error(r.error)
                  })
                }
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await saveResource(resource?.id ?? null, v)
                  r.ok ? (toast.success(r.message), setOpen(false), router.refresh()) : toast.error(r.error)
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
