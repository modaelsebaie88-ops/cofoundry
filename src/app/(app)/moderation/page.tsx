import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import ReportsList from "../admin/reports/page"

export const metadata: Metadata = { title: "Moderation" }

/** Reports queue for community moderators. RLS limits rows to communities they moderate. */
export default async function ModerationPage(props: { searchParams: Promise<{ status?: string }> }) {
  const me = await requireProfile()
  const supabase = await createClient()
  const { count } = await supabase.from("community_members").select("community_id", { count: "exact", head: true }).eq("profile_id", me.id).eq("role", "moderator")
  if (!count && me.role !== "moderator" && me.role !== "admin") redirect("/dashboard")
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Moderation queue" description="Reports from the communities you moderate. Remove content that breaks the guidelines, or dismiss reports that don't." />
      <ReportsList searchParams={props.searchParams} />
    </div>
  )
}
