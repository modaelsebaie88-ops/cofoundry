"use client"

import Link from "next/link"
import { useCallback, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, LogOut, MoreVertical, Users } from "lucide-react"
import { toast } from "sonner"
import { leaveGroup, markConversationRead } from "@/actions/messages"
import { ChatThread, type ChatMessage } from "@/components/chat/chat-thread"
import { UserAvatar } from "@/components/shared/user-avatar"
import { useRealtime } from "@/components/shell/realtime-provider"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDistanceToNowStrict } from "date-fns"

type Person = { id: string; full_name: string; avatar_url: string | null; headline: string | null; last_seen_at: string | null }

export function ConversationView({
  conversation,
  me,
  people,
  initialMessages,
}: {
  conversation: { id: string; is_group: boolean; title: string | null }
  me: { id: string; full_name: string; avatar_url: string | null }
  people: Person[]
  initialMessages: ChatMessage[]
}) {
  const router = useRouter()
  const { online, setUnreadMessages } = useRealtime()
  const [, start] = useTransition()
  const others = people.filter((p) => p.id !== me.id)
  const other = others[0]

  const markRead = useCallback(() => {
    markConversationRead(conversation.id).then(() => router.refresh())
  }, [conversation.id, router])

  useEffect(() => {
    markRead()
    // Global badge is recomputed by the server layout on refresh; optimistic reset here.
    setUnreadMessages((n) => Math.max(0, n - 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id])

  const isOnline = other ? online.has(other.id) : false
  const status = conversation.is_group
    ? `${people.length} members · ${others.filter((o) => online.has(o.id)).length} online`
    : isOnline
      ? "Online"
      : other?.last_seen_at
        ? `Active ${formatDistanceToNowStrict(new Date(other.last_seen_at))} ago`
        : "Offline"

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <Link href="/messages" className="md:hidden" aria-label="Back to conversations">
          <ArrowLeft className="size-5" />
        </Link>
        {conversation.is_group ? (
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-sky-100 text-primary">
            <Users className="size-4" />
          </span>
        ) : (
          <UserAvatar name={other?.full_name} src={other?.avatar_url} online={isOnline} />
        )}
        <div className="min-w-0 flex-1">
          {conversation.is_group ? (
            <p className="truncate font-semibold">{conversation.title}</p>
          ) : (
            <Link href={`/founders/${other?.id}`} className="truncate font-semibold hover:underline">
              {other?.full_name ?? "Founder"}
            </Link>
          )}
          <p className="truncate text-xs text-muted-foreground">{conversation.is_group ? others.map((o) => o.full_name.split(" ")[0]).join(", ") + " · " + status : status}</p>
        </div>
        {conversation.is_group && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Conversation options" />}>
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  start(async () => {
                    if (!confirm("Leave this group?")) return
                    const r = await leaveGroup(conversation.id)
                    if (r.ok) {
                      router.push("/messages")
                      router.refresh()
                    } else toast.error(r.error)
                  })
                }
              >
                <LogOut /> Leave group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <ChatThread
        key={conversation.id}
        className="flex-1"
        source={{ table: "messages", column: "conversation_id", id: conversation.id, prefix: `dm/${conversation.id}` }}
        me={me}
        initialMessages={initialMessages}
        initialProfiles={Object.fromEntries(people.map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]))}
        onActivity={markRead}
      />
    </>
  )
}
