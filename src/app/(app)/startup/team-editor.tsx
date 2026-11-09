"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { addTeamMember, removeTeamMember } from "@/actions/profile"
import { Tag } from "@/components/shared/badges"
import { NativeSelect } from "@/components/shared/native-select"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Member = { id: string; full_name: string; avatar_url: string | null; headline: string | null; title: string | null; is_founder: boolean }

export function TeamEditor({ ownerId, members, candidates }: { ownerId: string; members: Member[]; candidates: { id: string; full_name: string }[] }) {
  const [who, setWho] = useState("")
  const [title, setTitle] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-xl border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 p-3">
            <UserAvatar name={m.full_name} src={m.avatar_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{m.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.title ?? m.headline}</p>
            </div>
            {m.is_founder && <Tag tone="primary">Founder</Tag>}
            {m.id !== ownerId && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${m.full_name}`}
                onClick={() =>
                  start(async () => {
                    const r = await removeTeamMember(m.id)
                    r.ok ? router.refresh() : toast.error(r.error)
                  })
                }
              >
                <X />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {candidates.length ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <NativeSelect value={who} onChange={(e) => setWho(e.target.value)} aria-label="Connection to add">
            <option value="">Add one of your connections…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </NativeSelect>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Role, e.g. CTO" maxLength={80} className="h-10" aria-label="Role" />
          <Button
            className="h-10"
            disabled={pending || !who}
            onClick={() =>
              start(async () => {
                const r = await addTeamMember(who, title)
                if (r.ok) {
                  setWho("")
                  setTitle("")
                  router.refresh()
                } else toast.error(r.error)
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add member
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Team members must be your connections. Connect with collaborators to add them here.</p>
      )}
    </div>
  )
}
