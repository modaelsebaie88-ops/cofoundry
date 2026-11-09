import type { Metadata } from "next"
import Link from "next/link"
import { Briefcase, Send } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { OPPORTUNITY_TYPES } from "@/lib/constants"
import { Tag } from "@/components/shared/badges"
import { LinkButton } from "@/components/shared/link-button"
import { EmptyState, PageHeader, Panel, SectionTitle } from "@/components/shared/page-header"
import { RelativeTime } from "@/components/shared/relative-time"

export const metadata: Metadata = { title: "My opportunities" }

const statusTone = { pending: "default", accepted: "success", declined: "default", withdrawn: "default" } as const

export default async function MyOpportunitiesPage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const [{ data: posted }, { data: applied }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, title, type, status, application_count, created_at, opportunity_applications(status)")
      .eq("author_id", me.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("opportunity_applications")
      .select("id, status, created_at, opportunities(id, title, type, status)")
      .eq("applicant_id", me.id)
      .order("created_at", { ascending: false }),
  ])
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="My opportunities" description="Manage what you've posted and track your applications." actions={<LinkButton href="/opportunities/new">Post opportunity</LinkButton>} />
      <section>
        <SectionTitle>Posted by you</SectionTitle>
        {posted?.length ? (
          <Panel className="divide-y">
            {posted.map((o) => {
              const pending = o.opportunity_applications.filter((a) => a.status === "pending").length
              return (
                <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <Link href={`/opportunities/${o.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium hover:text-primary">{o.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {OPPORTUNITY_TYPES[o.type].label} · <RelativeTime date={o.created_at} />
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Tag tone={o.status === "open" ? "success" : "default"}>{o.status === "open" ? "Open" : "Closed"}</Tag>
                    <LinkButton href={`/opportunities/${o.id}/manage`} size="sm" variant={pending ? "default" : "outline"}>
                      {o.application_count} applications{pending ? ` · ${pending} new` : ""}
                    </LinkButton>
                  </div>
                </div>
              )
            })}
          </Panel>
        ) : (
          <EmptyState icon={Briefcase} title="You haven't posted any opportunities" />
        )}
      </section>
      <section>
        <SectionTitle>Your applications</SectionTitle>
        {applied?.length ? (
          <Panel className="divide-y">
            {applied.map((a) => (
              <Link key={a.id} href={`/opportunities/${a.opportunities?.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.opportunities?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Applied <RelativeTime date={a.created_at} />
                    {a.opportunities?.status === "closed" && " · opportunity closed"}
                  </p>
                </div>
                <Tag tone={statusTone[a.status as keyof typeof statusTone]} className="capitalize">
                  {a.status}
                </Tag>
              </Link>
            ))}
          </Panel>
        ) : (
          <EmptyState icon={Send} title="No applications yet" description="Browse the marketplace and express interest in opportunities that fit you." />
        )}
      </section>
    </div>
  )
}
