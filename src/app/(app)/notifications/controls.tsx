"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, CheckCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { clearReadNotifications, deleteNotification, markNotificationsRead } from "@/actions/notifications"
import { useRealtime } from "@/components/shell/realtime-provider"
import { Button } from "@/components/ui/button"

export function NotificationControls({ hasUnread }: { hasUnread: boolean }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const { setUnreadNotifications } = useRealtime()
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !hasUnread}
        onClick={() =>
          start(async () => {
            await markNotificationsRead()
            setUnreadNotifications(() => 0)
            router.refresh()
          })
        }
      >
        <CheckCheck /> Mark all read
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await clearReadNotifications()
            r.ok ? (toast.success("Cleared read notifications"), router.refresh()) : toast.error(r.error)
          })
        }
      >
        <Trash2 /> Clear read
      </Button>
    </>
  )
}

export function NotificationItemActions({ id, isRead }: { id: string; isRead: boolean }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const { setUnreadNotifications } = useRealtime()
  return (
    <div className="flex shrink-0 items-start gap-0.5 opacity-60 group-hover:opacity-100">
      {!isRead && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mark as read"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await markNotificationsRead([id])
              setUnreadNotifications((n) => Math.max(0, n - 1))
              router.refresh()
            })
          }
        >
          <Check />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete notification"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await deleteNotification(id)
            if (!isRead) setUnreadNotifications((n) => Math.max(0, n - 1))
            router.refresh()
          })
        }
      >
        <Trash2 />
      </Button>
    </div>
  )
}
