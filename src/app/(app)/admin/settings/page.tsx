import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { aiConfig } from "@/lib/ai/client"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { SettingsForm } from "./settings-form"

export const metadata: Metadata = { title: "Settings · Admin" }

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("platform_settings").select("key, value")
  const get = (k: string) => data?.find((d) => d.key === k)?.value
  const ai = aiConfig()
  return (
    <div className="max-w-2xl space-y-6">
      <Panel className="p-6">
        <SectionTitle>Platform settings</SectionTitle>
        <SettingsForm
          initial={{
            allow_signups: get("allow_signups") !== false,
            community_chat_enabled: get("community_chat_enabled") !== false,
            announcement_banner: typeof get("announcement_banner") === "string" ? (get("announcement_banner") as string) : "",
          }}
        />
      </Panel>
      <Panel className="p-6">
        <SectionTitle>Integrations</SectionTitle>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt>AI assistant</dt>
            <dd className={ai.enabled ? "font-medium text-emerald-600" : "text-muted-foreground"}>{ai.enabled ? `Enabled · ${ai.model}` : "Not configured (set AI_API_KEY)"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Google sign-in</dt>
            <dd className="text-muted-foreground">{process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" ? "Enabled" : "Disabled"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Integration credentials are environment variables on the server and are never editable from the browser.</p>
      </Panel>
    </div>
  )
}
