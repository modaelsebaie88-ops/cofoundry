import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Globe, MapPin, Pencil, Users } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { COLLAB_TYPES, OPPORTUNITY_TYPES, STAGES } from "@/lib/constants"
import { DemoBadge, StageBadge, Tag, VerifiedBadge } from "@/components/shared/badges"
import { LinkButton } from "@/components/shared/link-button"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { ReportButton } from "@/components/shared/report-dialog"
import { RichText } from "@/components/shared/rich-text"
import { SaveButton } from "@/components/shared/save-button"
import { StartupLogo, UserAvatar } from "@/components/shared/user-avatar"
import { MessageButton } from "@/components/network/connect-button"
import { ApplyPanel } from "./apply-panel"
import { OwnerActions } from "./owner-actions"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("opportunities").select("title").eq("id", id).maybeSingle()
  return { title: data?.title ?? "Opportunity" }
}

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: o } = await supabase
    .from("opportunities")
    .select(
      "*, categories(name), author:profiles!opportunities_author_id_fkey(id, full_name, avatar_url, headline, is_verified, is_demo), startup:startups(name, slug, logo_url, tagline, stage)"
    )
    .eq("id", id)
    .maybeSingle()
  if (!o) notFound()
  const isOwner = o.author_id === me.id
  const [{ data: myApp }, { data: saved }] = await Promise.all([
    supabase.from("opportunity_applications").select("id, status, message, created_at").eq("opportunity_id", id).eq("applicant_id", me.id).maybeSingle(),
    supabase.from("saved_items").select("item_id").eq("profile_id", me.id).eq("item_type", "opportunity").eq("item_id", id).maybeSingle(),
  ])

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/opportunities" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All opportunities
      </Link>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <Panel className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="primary">{OPPORTUNITY_TYPES[o.type].label}</Tag>
              {o.status === "closed" && <Tag>Closed</Tag>}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{o.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{COLLAB_TYPES[o.collaboration_type]}</span>
              <span className="flex items-center gap-1">
                {o.is_remote ? <Globe className="size-3.5" /> : <MapPin className="size-3.5" />}
                {o.is_remote ? `Remote${o.location ? ` · ${o.location}` : ""}` : o.location}
              </span>
              {o.categories && <span>{o.categories.name}</span>}
              {o.stage && <span>{STAGES[o.stage].label} stage</span>}
              <span className="flex items-center gap-1">
                <Users className="size-3.5" /> {o.application_count} applied
              </span>
              <span>Posted {format(new Date(o.created_at), "MMM d, yyyy")}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {isOwner ? (
                <OwnerActions id={o.id} status={o.status as "open" | "closed"} />
              ) : (
                <>
                  <SaveButton itemType="opportunity" itemId={o.id} saved={Boolean(saved)} withLabel />
                  <ReportButton targetType="opportunity" targetId={o.id} snapshot={o.title} label />
                </>
              )}
            </div>
          </Panel>

          <Panel className="p-6">
            <SectionTitle>About this opportunity</SectionTitle>
            <RichText text={o.description} />
            {o.required_skills.length > 0 && (
              <>
                <h3 className="mt-6 mb-2 text-sm font-semibold">Required skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {o.required_skills.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
              </>
            )}
            {o.requirements && (
              <>
                <h3 className="mt-6 mb-2 text-sm font-semibold">Requirements</h3>
                <RichText text={o.requirements} />
              </>
            )}
          </Panel>

          {!isOwner && <ApplyPanel opportunityId={o.id} open={o.status === "open"} application={myApp} />}
        </div>

        <aside className="space-y-6">
          <Panel className="p-5">
            <SectionTitle>Posted by</SectionTitle>
            <Link href={`/founders/${o.author?.id}`} className="flex items-center gap-3">
              <UserAvatar name={o.author?.full_name} src={o.author?.avatar_url} />
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-medium">
                  {o.author?.full_name} {o.author?.is_verified && <VerifiedBadge />}
                </span>
                <span className="line-clamp-2 block text-xs text-muted-foreground">{o.author?.headline}</span>
              </span>
            </Link>
            {o.author?.is_demo && (
              <div className="mt-2">
                <DemoBadge />
              </div>
            )}
            {!isOwner && o.author && <MessageButton targetId={o.author.id} className="mt-4 w-full" label="Contact founder" />}
          </Panel>
          {o.startup && (
            <Panel className="p-5">
              <SectionTitle>Startup</SectionTitle>
              <Link href={`/startups/${o.startup.slug}`} className="flex items-center gap-3">
                <StartupLogo name={o.startup.name} src={o.startup.logo_url} />
                <span className="min-w-0">
                  <span className="block font-medium">{o.startup.name}</span>
                  <StageBadge stage={o.startup.stage} />
                </span>
              </Link>
              {o.startup.tagline && <p className="mt-3 text-sm text-muted-foreground">{o.startup.tagline}</p>}
            </Panel>
          )}
          {isOwner && (
            <LinkButton href={`/opportunities/${o.id}/manage`} className="w-full" size="lg">
              <Users /> Review applications ({o.application_count})
            </LinkButton>
          )}
          {isOwner && (
            <LinkButton href={`/opportunities/${o.id}/edit`} variant="outline" className="w-full">
              <Pencil /> Edit
            </LinkButton>
          )}
        </aside>
      </div>
    </div>
  )
}
