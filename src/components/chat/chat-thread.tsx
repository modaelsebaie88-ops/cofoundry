"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { format, isSameDay, isToday, isYesterday } from "date-fns"
import { ArrowDown, FileText, Flag, Loader2, Paperclip, SendHorizontal, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { MentionTextarea } from "@/components/shared/mention-textarea"
import { renderInline } from "@/components/shared/rich-text"
import { ReportDialog } from "@/components/shared/report-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { useRealtime } from "@/components/shell/realtime-provider"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn, formatBytes } from "@/lib/utils"

export type ChatMessage = {
  id: string
  sender_id: string
  body: string
  attachment_path: string | null
  attachment_name: string | null
  attachment_mime: string | null
  attachment_size?: number | null
  created_at: string
  pending?: boolean
}
export type ChatProfile = { full_name: string; avatar_url: string | null }

type Source =
  | { table: "messages"; column: "conversation_id"; id: string; prefix: string }
  | { table: "community_messages"; column: "community_id"; id: string; prefix: string }

const PAGE = 40
const MAX_FILE = 25 * 1024 * 1024

export function ChatThread({
  source,
  me,
  initialMessages,
  initialProfiles,
  canPost = true,
  canModerate = false,
  disabledReason,
  mentionCommunityId,
  onActivity,
  className,
}: {
  source: Source
  me: { id: string; full_name: string; avatar_url: string | null }
  initialMessages: ChatMessage[]
  initialProfiles: Record<string, ChatProfile>
  canPost?: boolean
  canModerate?: boolean
  disabledReason?: React.ReactNode
  mentionCommunityId?: string
  onActivity?: () => void
  className?: string
}) {
  const supabase = createClient() // singleton
  const { online } = useRealtime()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [profiles, setProfiles] = useState<Record<string, ChatProfile>>({ ...initialProfiles, [me.id]: me })
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState<Record<string, number>>({})
  const [hasMore, setHasMore] = useState(initialMessages.length >= PAGE)
  const [loadingMore, setLoadingMore] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const [reporting, setReporting] = useState<ChatMessage | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastTypingSent = useRef(0)
  const onActivityRef = useRef(onActivity)
  useEffect(() => {
    onActivityRef.current = onActivity
  })

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" })
  }, [])

  useLayoutEffect(() => scrollToBottom(), [scrollToBottom])

  const ensureProfile = useCallback(
    async (id: string) => {
      if (profiles[id]) return
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", id).maybeSingle()
      if (data) setProfiles((p) => ({ ...p, [id]: data }))
    },
    [profiles, supabase]
  )

  // Live updates + typing indicators
  useEffect(() => {
    const ch = supabase
      .channel(`chat:${source.table}:${source.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: source.table, filter: `${source.column}=eq.${source.id}` },
        (payload) => {
          const m = payload.new as ChatMessage
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]))
          setTyping((t) => {
            const n = { ...t }
            delete n[m.sender_id]
            return n
          })
          ensureProfile(m.sender_id)
          if (m.sender_id !== me.id) onActivityRef.current?.()
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: source.table }, (payload) => {
        const id = (payload.old as { id: string }).id
        setMessages((prev) => prev.filter((x) => x.id !== id))
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { userId } = payload as { userId: string }
        if (userId !== me.id) {
          setTyping((t) => ({ ...t, [userId]: Date.now() }))
          ensureProfile(userId)
        }
      })
      .subscribe()
    channelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.table, source.id, me.id])

  // Expire typing indicators
  useEffect(() => {
    const t = setInterval(() => {
      setTyping((ty) => {
        const now = Date.now()
        const next = Object.fromEntries(Object.entries(ty).filter(([, at]) => now - at < 4000))
        return Object.keys(next).length === Object.keys(ty).length ? ty : next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Keep pinned to bottom when new messages arrive (if the user is already there)
  useEffect(() => {
    if (atBottom) scrollToBottom(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  function notifyTyping() {
    const now = Date.now()
    if (now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now
      channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: me.id } })
    }
  }

  async function loadOlder() {
    if (!messages.length) return
    setLoadingMore(true)
    const el = scroller.current
    const prevHeight = el?.scrollHeight ?? 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from(source.table) as any)
      .select("id, sender_id, body, attachment_path, attachment_name, attachment_mime, created_at")
      .eq(source.column, source.id)
      .lt("created_at", messages[0].created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE)
    const older = ((data ?? []) as ChatMessage[]).reverse()
    setHasMore(older.length >= PAGE)
    setMessages((m) => [...older, ...m])
    older.forEach((m) => ensureProfile(m.sender_id))
    setLoadingMore(false)
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight
    })
  }

  async function send() {
    const body = text.trim()
    if ((!body && !file) || sending) return
    setSending(true)
    try {
      let attachment: Pick<ChatMessage, "attachment_path" | "attachment_name" | "attachment_mime" | "attachment_size"> = {
        attachment_path: null,
        attachment_name: null,
        attachment_mime: null,
      }
      if (file) {
        if (file.size > MAX_FILE) throw new Error("Files must be 25 MB or smaller.")
        const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120)
        const path = `${source.prefix}/${crypto.randomUUID()}-${safeName}`
        const { error } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type || "application/octet-stream" })
        if (error) throw new Error(error.message)
        attachment = { attachment_path: path, attachment_name: file.name.slice(0, 255), attachment_mime: file.type || null, attachment_size: file.size }
      }
      const row = {
        [source.column]: source.id,
        sender_id: me.id,
        body: body.slice(0, source.table === "messages" ? 5000 : 4000),
        ...attachment,
      }
      if (source.table === "community_messages") delete (row as Record<string, unknown>).attachment_size
      const { data, error } = await supabase
        .from(source.table)
        .insert(row as never)
        .select("id, sender_id, body, attachment_path, attachment_name, attachment_mime, created_at")
        .single()
      if (error) throw new Error(/row-level/.test(error.message) ? "You can't post here." : error.message)
      setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as ChatMessage]))
      setText("")
      setFile(null)
      requestAnimationFrame(() => scrollToBottom(true))
      onActivityRef.current?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Message failed to send")
    } finally {
      setSending(false)
    }
  }

  async function remove(m: ChatMessage) {
    const { error, data } = await supabase.from(source.table).delete().eq("id", m.id).select("id")
    if (error || !data?.length) return toast.error("Couldn't delete this message.")
    setMessages((prev) => prev.filter((x) => x.id !== m.id))
  }

  const typingNames = Object.keys(typing).map((id) => profiles[id]?.full_name?.split(" ")[0]).filter(Boolean)

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        ref={scroller}
        className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6"
        onScroll={(e) => {
          const el = e.currentTarget
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
        }}
        aria-live="polite"
      >
        {hasMore && (
          <div className="mb-4 flex justify-center">
            <Button variant="ghost" size="xs" onClick={loadOlder} disabled={loadingMore}>
              {loadingMore && <Loader2 className="animate-spin" />} Load earlier messages
            </Button>
          </div>
        )}
        {messages.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No messages yet — say hello 👋</p>}
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const d = new Date(m.created_at)
          const newDay = !prev || !isSameDay(new Date(prev.created_at), d)
          const grouped = !newDay && prev?.sender_id === m.sender_id && d.getTime() - new Date(prev.created_at).getTime() < 5 * 60_000
          const author = profiles[m.sender_id]
          const mine = m.sender_id === me.id
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-4 flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  {isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE, MMM d")}
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className={cn("group relative flex gap-3 rounded-lg px-2 py-0.5 hover:bg-muted/40", !grouped && "mt-3")}>
                <div className="w-9 shrink-0">
                  {!grouped && <UserAvatar name={author?.full_name} src={author?.avatar_url} size="sm" online={online.has(m.sender_id)} />}
                </div>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <p className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{author?.full_name ?? "…"}</span>
                      <time className="text-[11px] text-muted-foreground" dateTime={m.created_at} title={format(d, "PPpp")}>
                        {format(d, "p")}
                      </time>
                    </p>
                  )}
                  {m.body && <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">{renderInline(m.body)}</div>}
                  {m.attachment_path && <Attachment path={m.attachment_path} name={m.attachment_name} mime={m.attachment_mime} size={m.attachment_size} />}
                </div>
                <div className="absolute top-0 right-2 hidden gap-0.5 rounded-md border bg-white p-0.5 shadow-sm group-hover:flex">
                  {(mine || canModerate) && (
                    <Button variant="ghost" size="icon-xs" aria-label="Delete message" onClick={() => remove(m)}>
                      <Trash2 />
                    </Button>
                  )}
                  {!mine && (
                    <Button variant="ghost" size="icon-xs" aria-label="Report message" onClick={() => setReporting(m)}>
                      <Flag />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!atBottom && (
        <div className="relative">
          <Button size="xs" variant="outline" className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white shadow" onClick={() => scrollToBottom(true)}>
            <ArrowDown /> Latest
          </Button>
        </div>
      )}

      <div className="border-t bg-white px-4 py-3 sm:px-6">
        <p className="h-4 text-[11px] text-muted-foreground" aria-live="polite">
          {typingNames.length > 0 && `${typingNames.slice(0, 2).join(" and ")} ${typingNames.length > 1 ? "are" : "is"} typing…`}
        </p>
        {canPost ? (
          <div className="space-y-2">
            {file && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <FileText className="size-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                <button type="button" onClick={() => setFile(null)} aria-label="Remove attachment">
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" aria-label="Attach a file" onClick={() => fileInput.current?.click()} disabled={sending}>
                <Paperclip />
              </Button>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f && f.size > MAX_FILE) toast.error("Files must be 25 MB or smaller.")
                  else if (f) setFile(f)
                  e.target.value = ""
                }}
              />
              <div className="flex-1">
                <MentionTextarea
                  rows={1}
                  value={text}
                  onValueChange={(v) => {
                    setText(v)
                    notifyTyping()
                  }}
                  communityId={mentionCommunityId}
                  onSubmitShortcut={send}
                  placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
                  className="max-h-40 min-h-10"
                  aria-label="Message"
                />
              </div>
              <Button size="icon" className="size-10" onClick={send} disabled={sending || (!text.trim() && !file)} aria-label="Send message">
                {sending ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/60 px-4 py-3 text-center text-sm text-muted-foreground">{disabledReason}</div>
        )}
      </div>
      {reporting && (
        <ReportDialog
          open
          onOpenChange={(o) => !o && setReporting(null)}
          targetType={source.table === "messages" ? "message" : "community_message"}
          targetId={reporting.id}
          communityId={source.table === "community_messages" ? source.id : null}
          snapshot={reporting.body}
        />
      )}
    </div>
  )
}

function Attachment({ path, name, mime, size }: { path: string; name: string | null; mime: string | null; size?: number | null }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    createClient()
      .storage.from("attachments")
      .createSignedUrl(path, 3600)
      .then(({ data }) => alive && setUrl(data?.signedUrl ?? null))
    return () => {
      alive = false
    }
  }, [path])
  if (mime?.startsWith("image/")) {
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block w-fit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name ?? "Image"} className="max-h-64 max-w-xs rounded-lg border object-cover" />
      </a>
    ) : (
      <div className="mt-1.5 h-40 w-60 animate-pulse rounded-lg bg-muted" />
    )
  }
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      download={name ?? undefined}
      className="mt-1.5 flex w-fit max-w-xs items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-muted/50"
    >
      <FileText className="size-5 shrink-0 text-primary" />
      <span className="min-w-0">
        <span className="block truncate font-medium">{name ?? "Attachment"}</span>
        {size ? <span className="text-xs text-muted-foreground">{formatBytes(size)}</span> : null}
      </span>
    </a>
  )
}
