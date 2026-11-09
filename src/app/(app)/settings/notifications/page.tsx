import type { Metadata } from "next"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { PrefsForm } from "./prefs-form"

export const metadata: Metadata = { title: "Notification preferences" }

export default async function NotificationPrefsPage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const { data } = await supabase.from("notification_preferences").select("prefs").eq("profile_id", me.id).maybeSingle()
  return (
    <Panel className="p-5 sm:p-8">
      <SectionTitle>In-app notifications</SectionTitle>
      <p className="mb-5 text-sm text-muted-foreground">Choose which activity creates notifications. Turned-off types are never delivered.</p>
      <PrefsForm initial={(data?.prefs as Record<string, boolean>) ?? {}} />
    </Panel>
  )
}
