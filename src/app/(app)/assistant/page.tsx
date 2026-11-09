import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, Compass, Info, Users } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { aiConfig } from "@/lib/ai/client"
import { CAPABILITIES, STAGES } from "@/lib/constants"
import { STAGE_PLAYBOOK, teamGaps } from "@/lib/insights"
import { capabilitiesOf, needsOf } from "@/lib/matching/engine"
import { loadSignals } from "@/lib/matching/service"
import { Panel, PageHeader, SectionTitle } from "@/components/shared/page-header"
import { Tag } from "@/components/shared/badges"
import { AssistantChat } from "./assistant-chat"

export const metadata: Metadata = { title: "AI Assistant" }

export default async function AssistantPage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const cfg = aiConfig()
  const [[signals], { data: startup }] = await Promise.all([
    loadSignals(supabase, [me.id]),
    supabase.from("startups").select("id, name, stage").eq("owner_id", me.id).maybeSingle(),
  ])
  let teamCaps = signals ? capabilitiesOf(signals) : []
  if (startup) {
    const { data: team } = await supabase.from("startup_members").select("profile_id").eq("startup_id", startup.id)
    teamCaps = [...new Set((await loadSignals(supabase, (team ?? []).map((t) => t.profile_id))).flatMap(capabilitiesOf))]
  }
  const gaps = teamGaps(signals ? needsOf(signals) : [], teamCaps)
  const playbook = startup ? STAGE_PLAYBOOK[startup.stage] : STAGE_PLAYBOOK.idea

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <PageHeader title="AI Startup Assistant" description="Advice grounded in your profile and live Cofoundry data — collaborators, team gaps, communities, partnerships and copywriting." />
        {cfg.enabled ? (
          <AssistantChat firstName={me.full_name.split(" ")[0]} model={cfg.model} />
        ) : (
          <Panel className="p-8 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="size-6" />
            </div>
            <p className="font-semibold">The AI assistant isn&apos;t configured yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              An administrator needs to set <code className="rounded bg-muted px-1">AI_API_KEY</code> and <code className="rounded bg-muted px-1">AI_MODEL</code> (and optionally{" "}
              <code className="rounded bg-muted px-1">AI_BASE_URL</code> for any OpenAI-compatible provider) on the server. Keys never reach the browser.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
              Meanwhile, the rule-based insights on this page and your{" "}
              <Link href="/discover?tab=recommended" className="font-medium text-primary hover:underline">
                transparent match recommendations
              </Link>{" "}
              work without AI.
            </p>
          </Panel>
        )}
      </div>
      <aside className="space-y-6">
        <Panel className="p-5">
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Users className="size-4 text-primary" /> Team gap analysis
            </span>
          </SectionTitle>
          <p className="mb-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-px size-3 shrink-0" /> Rule-based insight from your team&apos;s profiles — not AI generated.
          </p>
          <p className="text-xs font-medium text-muted-foreground">Your team covers</p>
          <div className="mt-1 mb-3 flex flex-wrap gap-1">{gaps.covered.length ? gaps.covered.map((c) => <Tag key={c} tone="success">{c}</Tag>) : <span className="text-xs text-muted-foreground">Add skills to your profile</span>}</div>
          <p className="text-xs font-medium text-muted-foreground">Needs not covered</p>
          <div className="mt-1 mb-3 flex flex-wrap gap-1">{gaps.declaredGaps.length ? gaps.declaredGaps.map((c) => <Tag key={c} tone="primary">{CAPABILITIES[c].label}</Tag>) : <span className="text-xs text-muted-foreground">None declared</span>}</div>
          {gaps.essentialGaps.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground">Also worth considering</p>
              <div className="mt-1 flex flex-wrap gap-1">{gaps.essentialGaps.map((c) => <Tag key={c}>{CAPABILITIES[c].label}</Tag>)}</div>
            </>
          )}
        </Panel>
        <Panel className="p-5">
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Compass className="size-4 text-primary" /> {startup ? `${STAGES[startup.stage].label} stage playbook` : "Idea stage playbook"}
            </span>
          </SectionTitle>
          <p className="text-sm">{playbook.focus}</p>
          <ul className="mt-3 space-y-2">
            {playbook.challenges.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" /> {c}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Curated guidance by stage — not AI generated.</p>
        </Panel>
      </aside>
    </div>
  )
}
