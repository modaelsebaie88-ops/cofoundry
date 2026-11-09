"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { createCategory, deleteCategory, updateCategory } from "@/actions/admin"
import { ICON_NAMES } from "@/components/shared/category-icon"
import { NativeSelect } from "@/components/shared/native-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CategoryForm() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("sparkles")
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_2fr_160px_auto]">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={80} />
      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" maxLength={500} />
      <NativeSelect value={icon} onChange={(e) => setIcon(e.target.value)} className="h-8" aria-label="Icon">
        {ICON_NAMES.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </NativeSelect>
      <Button
        disabled={pending || name.trim().length < 2}
        onClick={() =>
          start(async () => {
            const r = await createCategory({ name, description, icon })
            if (r.ok) {
              toast.success(r.message)
              setName("")
              setDescription("")
              router.refresh()
            } else toast.error(r.error)
          })
        }
      >
        <Plus /> Add
      </Button>
    </div>
  )
}

export function CategoryRowActions({ category }: { category: { id: number; name: string; description: string; icon: string } }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description)
  const [pending, start] = useTransition()
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn()
      r.ok ? (toast.success(r.message), setEditing(false), router.refresh()) : toast.error(r.error)
    })
  if (editing)
    return (
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="w-40" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} className="w-56" />
        <Button size="icon-sm" disabled={pending} onClick={() => run(() => updateCategory(category.id, { name, description, icon: category.icon }))} aria-label="Save">
          <Check />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
          <X />
        </Button>
      </div>
    )
  return (
    <div className="flex gap-1">
      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label={`Edit ${category.name}`}>
        <Pencil />
      </Button>
      <Button size="icon-sm" variant="ghost" disabled={pending} onClick={() => confirm(`Delete ${category.name}? Startups in it become uncategorised.`) && run(() => deleteCategory(category.id))} aria-label={`Delete ${category.name}`}>
        <Trash2 />
      </Button>
    </div>
  )
}
