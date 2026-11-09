import { Suspense } from "react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { RealtimeProvider } from "@/components/shell/realtime-provider"
import { Sidebar } from "@/components/shell/sidebar"
import { Topbar } from "@/components/shell/topbar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const [{ count: unreadNotifications }, { data: unreadMessages }, { data: banner }, { count: modCount }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", profile.id).eq("is_read", false),
    supabase.rpc("unread_message_count"),
    supabase.from("platform_settings").select("value").eq("key", "announcement_banner").maybeSingle(),
    supabase.from("community_members").select("community_id", { count: "exact", head: true }).eq("profile_id", profile.id).eq("role", "moderator"),
  ])
  const bannerText = typeof banner?.value === "string" ? banner.value.trim() : ""
  const isModerator = profile.role === "moderator" || profile.role === "admin" || (modCount ?? 0) > 0

  return (
    <RealtimeProvider
      userId={profile.id}
      initialNotifications={unreadNotifications ?? 0}
      initialMessages={Number(unreadMessages ?? 0)}
    >
      <Sidebar isAdmin={profile.role === "admin"} isModerator={isModerator} />
      <div className="lg:pl-60">
        <Suspense>
          <Topbar
            user={{ id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, headline: profile.headline, role: profile.role }}
            isModerator={isModerator}
          />
        </Suspense>
        {bannerText && (
          <div role="status" className="border-b border-primary/15 bg-accent/60 px-4 py-2 text-center text-sm text-accent-foreground sm:px-6">
            {bannerText}
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </RealtimeProvider>
  )
}
