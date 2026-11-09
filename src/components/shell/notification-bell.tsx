"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { markNotificationsRead } from "@/actions/notifications"
import { NotificationIcon } from "@/components/notifications/notification-icon"
import { RelativeTime } from "@/components/shared/relative-time"
import { useRealtime } from "@/components/shell/realtime-provider"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }

export function NotificationBell() {
  const { unreadNotifications, setUnreadNotifications, userId } = useRealtime()
  const [items, setItems] = useState<Notif[] | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  async function load() {
    const { data } = await createClient()
      .from("notifications")
      .select("id, type, title, body, link, is_read, created_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(8)
    setItems(data ?? [])
  }

  function markAll() {
    start(async () => {
      await markNotificationsRead()
      setUnreadNotifications(() => 0)
      setItems((xs) => xs?.map((x) => ({ ...x, is_read: true })) ?? null)
    })
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) load()
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unreadNotifications ? ` (${unreadNotifications} unread)` : ""}`} />
        }
      >
        <Bell className="size-[18px]" />
        {unreadNotifications > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-white">
            {unreadNotifications > 9 ? "9+" : unreadNotifications}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="xs" onClick={markAll} disabled={pending || !unreadNotifications}>
            {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />} Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  if (!n.is_read) {
                    setUnreadNotifications((c) => Math.max(0, c - 1))
                    markNotificationsRead([n.id])
                  }
                  if (n.link) router.push(n.link)
                }}
                className={cn("flex w-full gap-3 border-b px-4 py-3 text-left transition last:border-0 hover:bg-muted/60", !n.is_read && "bg-accent/40")}
              >
                <NotificationIcon type={n.type} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm leading-snug">{n.title}</span>
                  {n.body && <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{n.body}</span>}
                  <RelativeTime date={n.created_at} className="mt-1 block text-[11px] text-muted-foreground" />
                </span>
                {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
              </button>
            ))
          )}
        </div>
        <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted/50">
          View all notifications
        </Link>
      </PopoverContent>
    </Popover>
  )
}
