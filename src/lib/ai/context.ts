import "server-only"

import { CAPABILITIES, STAGES, type Capability } from "@/lib/constants"
import { STAGE_PLAYBOOK, teamGaps } from "@/lib/insights"
import { capabilitiesOf, needsOf } from "@/lib/matching/engine"
import { loadSignals } from "@/lib/matching/service"
import { getRecommendations } from "@/lib/queries/recommendations"
import { suggestOpportunities } from "@/lib/queries/opportunities"
import type { ServerClient } from "@/lib/supabase/server"

/**
 * Builds the grounding context for the AI assistant from the founder's real
 * profile and live platform data. The model is instructed to reference only
 * these entities when recommending people, communities or opportunities.
 */
export async function buildAssistantContext(supabase: ServerClient, meId: string) {
  const [[me], { data: profile }, { data: startup }, recs, { data: memberships }, { data: communities }, { data: mentors }, { data: events }] = await Promise.all([
    loadSignals(supabase, [meId]),
    supabase.from("profiles").select("full_name, headline, bio, country, city, founder_role, years_experience, help_topics, availability").eq("id", meId).single(),
    supabase.from("startups").select("id, name, tagline, description, stage, target_market, business_model, team_size, current_needs, categories(name)").eq("owner_id", meId).maybeSingle(),
    getRecommendations(supabase, meId, 8),
    supabase.from("community_members").select("community_id").eq("profile_id", meId),
    supabase.from("communities").select("id, slug, name, member_count, category_id"),
    supabase.from("mentor_profiles").select("profile_id, expertise, profiles!inner(full_name)").eq("is_accepting", true).limit(15),
    supabase.from("events").select("id, title, type, starts_at").gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
  ])
  if (!me || !profile) throw new Error("Profile not found")

  let teamCaps: Capability[] = capabilitiesOf(me)
  if (startup) {
    const { data: team } = await supabase.from("startup_members").select("profile_id").eq("startup_id", startup.id)
    const teamSignals = await loadSignals(supabase, (team ?? []).map((t) => t.profile_id))
    teamCaps = [...new Set(teamSignals.flatMap(capabilitiesOf))]
  }
  const gaps = teamGaps(needsOf(me), teamCaps)
  const opps = await suggestOpportunities(
    supabase,
    { id: meId, offers: me.offers, looking_for: me.looking_for, seeking_cofounder: me.seeking_cofounder, open_to_partnerships: me.open_to_partnerships, skills: me.skills.map((s) => s.name), interests: me.interests },
    6
  )
  const joined = new Set((memberships ?? []).map((m) => m.community_id))
  const interestIds = new Set(me.interests)
  const suggestedCommunities = (communities ?? []).filter((c) => !joined.has(c.id)).sort((a, b) => Number(interestIds.has(b.category_id ?? -1)) - Number(interestIds.has(a.category_id ?? -1)) || b.member_count - a.member_count).slice(0, 5)

  const cap = (xs: Capability[]) => xs.map((c) => CAPABILITIES[c].label).join(", ") || "—"
  const lines: string[] = []
  lines.push(`## Founder`)
  lines.push(`Name: ${profile.full_name}. Headline: ${profile.headline ?? "—"}. Role: ${profile.founder_role ?? "—"}, ${profile.years_experience ?? "?"} years experience. Location: ${[profile.city, profile.country].filter(Boolean).join(", ") || "—"}.`)
  if (profile.bio) lines.push(`Bio: ${profile.bio}`)
  lines.push(`Skills: ${me.skills.map((s) => s.name).join(", ") || "—"}. Wants to learn: ${me.learning.join(", ") || "—"}.`)
  lines.push(`Looking for: ${cap(me.looking_for)}. Can offer: ${cap(me.offers)}. Seeking co-founder: ${me.seeking_cofounder ? "yes" : "no"}.`)
  if (startup) {
    lines.push(`\n## Startup`)
    lines.push(`${startup.name} — ${startup.tagline ?? ""}. Industry: ${startup.categories?.name ?? "—"}. Stage: ${STAGES[startup.stage].label}. Team size: ${startup.team_size ?? "?"}.`)
    if (startup.description) lines.push(`Description: ${startup.description}`)
    lines.push(`Target market: ${startup.target_market ?? "—"}. Business model: ${startup.business_model ?? "—"}. Current needs: ${cap(startup.current_needs as Capability[])}.`)
    const pb = STAGE_PLAYBOOK[startup.stage]
    lines.push(`Stage focus: ${pb.focus} Typical challenges: ${pb.challenges.join(" ")}`)
  } else {
    lines.push(`\n## Startup\nNo startup profile yet (exploring ideas).`)
  }
  lines.push(`\n## Team capability analysis (rule-based)`)
  lines.push(`Team covers: ${gaps.covered.join(", ") || "—"}. Declared needs not covered: ${cap(gaps.declaredGaps)}. Essential areas not covered: ${cap(gaps.essentialGaps)}.`)
  lines.push(`\n## Recommended founders on Cofoundry (transparent match scores)`)
  for (const r of recs) lines.push(`- [${r.founder.full_name}](/founders/${r.founder.id}) — ${r.founder.headline ?? ""} — ${r.score}% match. ${r.reasons.summary} Suggested: ${r.reasons.suggestion}`)
  if (!recs.length) lines.push("- (none yet)")
  lines.push(`\n## Communities not yet joined`)
  for (const c of suggestedCommunities) lines.push(`- [${c.name}](/communities/${c.slug}) — ${c.member_count} members`)
  lines.push(`\n## Relevant open opportunities`)
  for (const o of opps) lines.push(`- [${o.title}](/opportunities/${o.id}) — ${o.reason ?? ""}`)
  if (!opps.length) lines.push("- (none matched)")
  lines.push(`\n## Mentors accepting requests`)
  for (const m of mentors ?? []) lines.push(`- [${m.profiles.full_name}](/mentorship/${m.profile_id}) — ${m.expertise.join(", ")}`)
  lines.push(`\n## Upcoming events`)
  for (const e of events ?? []) lines.push(`- [${e.title}](/events/${e.id}) — ${new Date(e.starts_at).toDateString()}`)

  return lines.join("\n")
}

export const SYSTEM_PROMPT = `You are the Cofoundry Startup Assistant, an expert startup advisor inside a founder collaboration platform.
Help the founder find collaborators, identify missing skills in their team, choose communities, spot partnerships, write startup introductions, improve their profile copy, find relevant opportunities and anticipate stage-specific challenges.

Rules:
- Ground every recommendation about people, communities, opportunities, mentors or events in the PLATFORM CONTEXT below. Only mention entities listed there, and link them using the exact markdown links provided (e.g. [Name](/founders/id)). Never invent people, companies, scores or statistics.
- If the context lacks what's needed, say so and suggest how the founder can find it on Cofoundry (Discover, Opportunities, Communities) or what to add to their profile.
- Be concise, specific and actionable. Prefer short sections and bullet points. When writing copy (intros, descriptions), produce ready-to-use text.
- You give general startup guidance, not legal, tax or investment advice.`
