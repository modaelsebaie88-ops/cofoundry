import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Inbox } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { ApplicationCard } from "./application-card"

export const metadata: Metadata = { title: "Applications" }

export default async function ManageApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: o } = await supabase.from("opportunities").select("id, title, author_id").eq("id", id).maybeSingle()
  if (!o || o.author_id !== me.id) notFound()
  const { data: apps } = await supabase
    .from("opportunity_applications")
    .select("id, message, status, created_at, applicant:profiles!opportunity_applications_applicant_id_fkey(id, full_name, avatar_url, headline, is_verified, country, city)")
    .eq("opportunity_id", id)
    .order("created_at", { ascending: false })

  const active = (apps ?? []).filter((a) => a.status !== "withdrawn")
  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/opportunities/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to opportunity
      </Link>
      <PageHeader title="Applications" description={o.title} />
      {active.length ? (
        <div className="space-y-4">
          {active.map((a) => (
            <ApplicationCard key={a.id} application={a as never} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Inbox} title="No applications yet" description="You'll get a notification as soon as someone applies." />
      )}
    </div>
  )
}
