"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { Loader2, Search, Users, X } from "lucide-react"
import { toast } from "sonner"
import { createGroup } from "@/actions/messages"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import { useRealtime } from "@/components/shell/realtime-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { cn, stripMentions } from "@/lib/utils"

export type ConversationSummary = {
  id: string
  is_group: boolean
  title: string | null
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
  participants: { id: string; full_name: string; avatar_url: string | null; headline: string | null }[]
}

type SearchHit = { id: string; conversation_id: string; body: string; created_at: string }

export function ConversationList({
  meId,
  conversations,
  contacts,
}: {
  meId: string
  conversations: ConversationSummary[]
  contacts: { id: string; full_name: string; avatar_url: string | null }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ id?: string }>()
  const { online } = useRealtime()
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [groupOpen, setGroupOpen] = useState(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refresh ordering/unread counts whenever a message lands in any of our conversations.
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`inbox:${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current)
        refreshTimer.current = setTimeout(() => router.refresh(), 400)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [meId, router])

  // Full-text-ish search across message content (RLS limits results to your conversations).
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return
    const t = setTimeout(async () => {
      const { data } = await createClient()
        .from("messages")
        .select("id, conversation_id, body, created_at")
        .ilike("body", `%${term.replace(/[%,]/g, "")}%`)
        .order("created_at", { ascending: false })
        .limit(20)
      setHits(data ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  const name = (c: ConversationSummary) => (c.is_group ? c.title ?? "Group" : c.participants[0]?.full_name ?? "Conversation")
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return conversations
    return conversations.filter((c) => name(c).toLowerCase().includes(term) || c.participants.some((p) => p.full_name.toLowerCase().includes(term)))
  }, [q, conversations])
  const byId = new Map(conversations.map((c) => [c.id, c]))
  const visibleHits = q.trim().length >= 2 ? hits : null
  const inThread = Boolean(params.id) || pathname !== "/messages"

  return (
    <aside className={cn("w-full shrink-0 flex-col border-r bg-white md:flex md:w-80", inThread ? "hidden" : "flex")}>
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Messages</h1>
          <Button size="sm" variant="outline" onClick={() => setGroupOpen(true)}>
            <Users /> New group
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people & messages" className="h-9 pl-9" aria-label="Search conversations" />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && !visibleHits?.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {q ? "No conversations match." : "No conversations yet. Visit a founder's profile and press Message to start one."}
          </p>
        )}
        <ul>
          {filtered.map((c) => {
            const active = params.id === c.id
            const other = c.participants[0]
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className={cn("flex items-center gap-3 px-4 py-3 transition", active ? "bg-accent" : "hover:bg-muted/50")}>
                  {c.is_group ? (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-sky-100 text-primary">
                      <Users className="size-4" />
                    </span>
                  ) : (
                    <UserAvatar name={other?.full_name} src={other?.avatar_url} online={other ? online.has(other.id) : undefined} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate text-sm", Number(c.unread_count) > 0 ? "font-semibold" : "font-medium")}>{name(c)}</p>
                      {c.last_message_at && <RelativeTime date={c.last_message_at} className="shrink-0 text-[11px] text-muted-foreground" />}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-xs", Number(c.unread_count) > 0 ? "text-foreground" : "text-muted-foreground")}>
                        {c.last_message_preview ? stripMentions(c.last_message_preview) : c.is_group ? `${c.participants.length + 1} members` : "Say hello 👋"}
                      </p>
                      {Number(c.unread_count) > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-white">{c.unread_count}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        {visibleHits && visibleHits.length > 0 && (
          <div className="border-t">
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Messages</p>
            <ul>
              {visibleHits.map((h) => {
                const c = byId.get(h.conversation_id)
                return (
                  <li key={h.id}>
                    <Link href={`/messages/${h.conversation_id}`} className="block px-4 py-2.5 hover:bg-muted/50">
                      <p className="text-xs font-medium">{c ? name(c) : "Conversation"}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{stripMentions(h.body)}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
      <NewGroupDialog open={groupOpen} onOpenChange={setGroupOpen} contacts={contacts} />
    </aside>
  )
}

function NewGroupDialog({
  open,
  onOpenChange,
  contacts,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  contacts: { id: string; full_name: string; avatar_url: string | null }[]
}) {
  const [title, setTitle] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group conversation</DialogTitle>
          <DialogDescription>Groups can include any of your connections (minimum two).</DialogDescription>
        </DialogHeader>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Group name, e.g. “Lumen advisors”" maxLength={100} />
        {contacts.length ? (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {contacts.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                  <Checkbox checked={selected.includes(c.id)} onCheckedChange={(v) => setSelected((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))} />
                  <UserAvatar name={c.full_name} src={c.avatar_url} size="xs" />
                  <span className="text-sm">{c.full_name}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">You need connections to create a group. Connect with founders first.</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !title.trim() || selected.length < 2}
            onClick={() =>
              start(async () => {
                const r = await createGroup(title, selected)
                if (r.ok && r.data) {
                  onOpenChange(false)
                  setTitle("")
                  setSelected([])
                  router.push(`/messages/${r.data.id}`)
                } else if (!r.ok) toast.error(r.error)
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
