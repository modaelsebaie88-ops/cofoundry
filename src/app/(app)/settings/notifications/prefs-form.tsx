"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveNotificationPrefs } from "@/actions/profile"
import { NotificationIcon } from "@/components/notifications/notification-icon"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { NOTIFICATION_TYPES } from "@/lib/constants"

export function PrefsForm({ initial }: { initial: Record<string, boolean> }) {
  const [prefs, setPrefs] = useState(() => Object.fromEntries(Object.keys(NOTIFICATION_TYPES).map((k) => [k, initial[k] !== false])))
  const [pending, start] = useTransition()
  return (
    <div>
      <ul className="divide-y rounded-xl border">
        {Object.entries(NOTIFICATION_TYPES).map(([k, meta]) => (
          <li key={k}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
              <NotificationIcon type={k} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{meta.label}</span>
                <span className="block text-xs text-muted-foreground">{meta.description}</span>
              </span>
              <Switch checked={prefs[k]} onCheckedChange={(c) => setPrefs((p) => ({ ...p, [k]: c }))} />
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveNotificationPrefs(prefs)
              r.ok ? toast.success("Preferences saved") : toast.error(r.error)
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Save preferences
        </Button>
      </div>
    </div>
  )
}
