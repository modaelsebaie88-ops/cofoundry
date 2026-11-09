"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus, Shield, X } from "lucide-react"
import { toast } from "sonner"
import { deleteCommunity, saveCommunity, setCommunityModerator } from "@/actions/admin"
import { ICON_NAMES } from "@/components/shared/category-icon"
import { Field } from "@/components/shared/form"
import { NativeSelect } from "@/components/shared/native-select"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"

type C = { id: string; name: string; description: string; rules: string; icon: string }

export function CommunityEditor({ community }: { community: C | null }) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Omit<C, "id">>(community ?? { name: "", description: "", rules: "", icon: "users" })
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <>
      <Button size="sm" variant={community ? "outline" : "default"} onClick={() => setOpen(true)}>
        {community ? <Pencil /> : <Plus />} {community ? "Edit" : "New community"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{community ? `Edit ${community.name}` : "New community"}</DialogTitle>
          </DialogHeader>
          <Field label="Name">
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} />
          </Field>
          <Field label="Icon">
            <NativeSelect value={v.icon} onChange={(e) => setV({ ...v, icon: e.target.value })}>
              {ICON_NAMES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={2000} />
          </Field>
          <Field label="Guidelines">
            <Textarea rows={5} value={v.rules} onChange={(e) => setV({ ...v, rules: e.target.value })} maxLength={4000} />
          </Field>
          <DialogFooter className="sm:justify-between">
            {community ? (
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  confirm("Delete this community and all its posts and chat?") &&
                  start(async () => {
                    const r = await deleteCommunity(community.id)
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
                  const r = await saveCommunity(community?.id ?? null, v)
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

export function ModeratorManager({ communityId, moderators }: { communityId: string; moderators: { id: string; full_name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [results, setResults] = useState<{ id: string; full_name: string; avatar_url: string | null }[]>([])
  const [pending, start] = useTransition()
  const router = useRouter()
  useEffect(() => {
    if (q.trim().length < 2) return
    const t = setTimeout(async () => {
      const { data } = await createClient().from("profiles").select("id, full_name, avatar_url").ilike("full_name", `%${q.replace(/[%,]/g, "")}%`).limit(6)
      setResults(data ?? [])
    }, 200)
    return () => clearTimeout(t)
  }, [q])
  const set = (id: string, mod: boolean) =>
    start(async () => {
      const r = await setCommunityModerator(communityId, id, mod)
      r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
    })
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Shield /> Moderators
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Community moderators</DialogTitle>
          </DialogHeader>
          <ul className="space-y-1">
            {moderators.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                {m.full_name}
                <Button size="icon-xs" variant="ghost" aria-label={`Remove ${m.full_name}`} disabled={pending} onClick={() => set(m.id, false)}>
                  <X />
                </Button>
              </li>
            ))}
            {!moderators.length && <li className="text-sm text-muted-foreground">No moderators yet.</li>}
          </ul>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search founders to add as moderator" />
          <ul className="space-y-1">
            {(q.trim().length >= 2 ? results : []).map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <UserAvatar name={p.full_name} src={p.avatar_url} size="xs" />
                <span className="flex-1">{p.full_name}</span>
                <Button size="xs" variant="outline" disabled={pending || moderators.some((m) => m.id === p.id)} onClick={() => set(p.id, true)}>
                  Make moderator
                </Button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
