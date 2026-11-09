import type { Metadata } from "next"
import { ExternalLink, Rocket } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { loadProfileFormData } from "@/lib/queries/profile-form"
import { StartupForm } from "@/components/profile/profile-forms"
import { LinkButton } from "@/components/shared/link-button"
import { PageHeader, Panel, SectionTitle } from "@/components/shared/page-header"
import { VerifiedBadge } from "@/components/shared/badges"
import { MilestonesEditor } from "./milestones-editor"
import { TeamEditor } from "./team-editor"
import { DeleteStartupButton } from "./delete-startup"

export const metadata: Metadata = { title: "My Startup" }

export default async function MyStartupPage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const data = await loadProfileFormData(supabase, me)
  const s = data.startupRow

  if (!s) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Create your startup profile" description="A public page that showcases what you're building, your team, milestones and what you need." />
        <Panel className="p-5 sm:p-8">
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-soft-gradient p-4 text-sm">
            <Rocket className="size-5 text-primary" /> Founders with a startup profile get better matches — needs and stage feed straight into recommendations.
          </div>
          <StartupForm initial={data.emptyStartup} categories={data.categories} extended submitLabel="Create startup" />
        </Panel>
      </div>
    )
  }

  const [{ data: milestones }, { data: members }, { data: connections }] = await Promise.all([
    supabase.from("startup_milestones").select("id, title, description, achieved_on").eq("startup_id", s.id).order("achieved_on", { ascending: false, nullsFirst: false }),
    supabase.from("startup_members").select("title, is_founder, profiles(id, full_name, avatar_url, headline)").eq("startup_id", s.id),
    supabase
      .from("connections")
      .select("requester:profiles!connections_requester_id_fkey(id, full_name), addressee:profiles!connections_addressee_id_fkey(id, full_name)")
      .eq("status", "accepted")
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`),
  ])
  const memberIds = new Set((members ?? []).map((m) => m.profiles?.id))
  const candidates = (connections ?? [])
    .map((c) => (c.requester?.id === me.id ? c.addressee : c.requester))
    .filter((p): p is { id: string; full_name: string } => Boolean(p) && !memberIds.has(p!.id))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {s.name} {s.is_verified && <VerifiedBadge label="Verified startup" />}
          </span>
        }
        description="Edit your public startup profile, milestones and founding team."
        actions={
          <LinkButton href={`/startups/${s.slug}`} variant="outline">
            <ExternalLink /> View public page
          </LinkButton>
        }
      />
      <Panel className="p-5 sm:p-8">
        <SectionTitle>Startup details</SectionTitle>
        <StartupForm initial={data.startup!} categories={data.categories} extended />
      </Panel>
      <Panel className="p-5 sm:p-8">
        <SectionTitle>Founding team & members</SectionTitle>
        <TeamEditor
          ownerId={me.id}
          members={(members ?? []).filter((m) => m.profiles).map((m) => ({ ...m.profiles!, title: m.title, is_founder: m.is_founder }))}
          candidates={candidates}
        />
      </Panel>
      <Panel className="p-5 sm:p-8">
        <SectionTitle>Achievements & milestones</SectionTitle>
        <MilestonesEditor milestones={milestones ?? []} />
      </Panel>
      <Panel className="flex flex-col items-start justify-between gap-3 border-destructive/20 p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium">Delete startup profile</p>
          <p className="text-xs text-muted-foreground">Removes the public page, milestones and team. Opportunities stay but are detached.</p>
        </div>
        <DeleteStartupButton />
      </Panel>
    </div>
  )
}
