"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/actions/admin"
import { Field } from "@/components/shared/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

export function SettingsForm({ initial }: { initial: { allow_signups: boolean; community_chat_enabled: boolean; announcement_banner: string } }) {
  const [v, setV] = useState(initial)
  const [pending, start] = useTransition()
  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between rounded-xl border p-4">
        <span>
          <span className="block text-sm font-medium">Allow new sign-ups</span>
          <span className="text-xs text-muted-foreground">Existing members can still sign in.</span>
        </span>
        <Switch checked={v.allow_signups} onCheckedChange={(c) => setV({ ...v, allow_signups: c })} />
      </label>
      <label className="flex items-center justify-between rounded-xl border p-4">
        <span>
          <span className="block text-sm font-medium">Community chat enabled</span>
          <span className="text-xs text-muted-foreground">Enforced in the database — disables sending new chat messages everywhere.</span>
        </span>
        <Switch checked={v.community_chat_enabled} onCheckedChange={(c) => setV({ ...v, community_chat_enabled: c })} />
      </label>
      <Field label="Announcement banner" hint="Shown at the top of the app for all members. Leave empty to hide.">
        <Input value={v.announcement_banner} onChange={(e) => setV({ ...v, announcement_banner: e.target.value })} maxLength={280} />
      </Field>
      <div className="flex justify-end">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveSettings(v)
              r.ok ? toast.success(r.message) : toast.error(r.error)
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Save settings
        </Button>
      </div>
    </div>
  )
}
