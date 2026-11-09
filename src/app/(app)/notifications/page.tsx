import type { Metadata } from "next"
import Link from "next/link"
import { BellOff, Settings } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { NotificationIcon } from "@/components/notifications/notification-icon"
import { EmptyState, PageHeader, Panel } from "@/components/shared/page-header"
import { LinkButton } from "@/components/shared/link-button"
import { RelativeTime } from "@/components/shared/relative-time"
import { NotificationControls, NotificationItemActions } from "./controls"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Notifications" }

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()
  let q = supabase.from("notifications").select("id, type, title, body, link, is_read, created_at").eq("recipient_id", me.id)
  if (filter === "unread") q = q.eq("is_read", false)
  const { data } = await q.order("created_at", { ascending: false }).limit(100)
  const unread = (data ?? []).filter((n) => !n.is_read).length

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Connections, messages, replies, mentions, applications, events and workspace updates."
        actions={
          <>
            <NotificationControls hasUnread={unread > 0} />
            <LinkButton href="/settings/notifications" variant="ghost" size="sm">
              <Settings /> Preferences
            </LinkButton>
          </>
        }
      />
      <div className="mb-4 flex gap-1 rounded-lg border bg-white p-0.5 sm:w-fit">
        {[
          ["all", "All"],
          ["unread", "Unread"],
        ].map(([k, l]) => (
          <Link key={k} href={k === "all" ? "/notifications" : "/notifications?filter=unread"} className={cn("flex-1 rounded-md px-4 py-1.5 text-center text-sm font-medium", (filter === "unread") === (k === "unread") ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
            {l}
          </Link>
        ))}
      </div>
      {data?.length ? (
        <Panel className="divide-y">
          {data.map((n) => (
            <div key={n.id} className={cn("group flex gap-3 p-4", !n.is_read && "bg-accent/30")}>
              <NotificationIcon type={n.type} />
              <Link href={n.link ?? "#"} className="min-w-0 flex-1">
                <p className={cn("text-sm", !n.is_read && "font-medium")}>{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>}
                <RelativeTime date={n.created_at} className="mt-1 block text-xs text-muted-foreground" />
              </Link>
              <NotificationItemActions id={n.id} isRead={n.is_read} />
            </div>
          ))}
        </Panel>
      ) : (
        <EmptyState icon={BellOff} title={filter === "unread" ? "No unread notifications" : "No notifications yet"} />
      )}
    </div>
  )
}
