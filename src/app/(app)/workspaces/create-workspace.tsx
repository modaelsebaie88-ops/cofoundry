"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { createWorkspace } from "@/actions/workspaces"
import { Field } from "@/components/shared/form"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function CreateWorkspaceDialog({ contacts }: { contacts: { id: string; full_name: string; avatar_url: string | null }[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [members, setMembers] = useState<string[]>([])
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> New workspace
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a workspace</DialogTitle>
            <DialogDescription>Workspaces are private to their members. You can invite your connections.</DialogDescription>
          </DialogHeader>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Lumen × Daniel — MVP sprint" />
          </Field>
          <Field label="Purpose (optional)">
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </Field>
          <Field label="Invite connections">
            {contacts.length ? (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {contacts.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                      <Checkbox checked={members.includes(c.id)} onCheckedChange={(v) => setMembers((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))} />
                      <UserAvatar name={c.full_name} src={c.avatar_url} size="xs" />
                      <span className="text-sm">{c.full_name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No connections yet — you can invite people later.</p>
            )}
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || name.trim().length < 2}
              onClick={() =>
                start(async () => {
                  const r = await createWorkspace({ name, description, members })
                  if (r.ok && r.data) {
                    setOpen(false)
                    router.push(`/workspaces/${r.data.id}`)
                  } else if (!r.ok) toast.error(r.error)
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
