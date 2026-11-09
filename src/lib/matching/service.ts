import "server-only"

import type { ServerClient } from "@/lib/supabase/server"
import type { Capability, CollabType, StartupStage } from "@/lib/constants"
import { rankMatches, scoreMatch, type FounderSignals, type MatchContext, type MatchResult } from "./engine"

const SIGNAL_SELECT = `
  id, full_name, founder_role, looking_for, offers, seeking_cofounder, open_to_partnerships,
  collaboration_types, country, city, years_experience,
  profile_skills ( kind, skills ( name, capability ) ),
  profile_interests ( category_id ),
  startups!startups_owner_id_fkey ( name, category_id, stage, current_needs )
`

type Row = {
  id: string
  full_name: string
  founder_role: string | null
  looking_for: Capability[]
  offers: Capability[]
  seeking_cofounder: boolean
  open_to_partnerships: boolean
  collaboration_types: CollabType[]
  country: string | null
  city: string | null
  years_experience: number | null
  profile_skills: { kind: string; skills: { name: string; capability: Capability | null } | null }[]
  profile_interests: { category_id: number }[]
  startups:
    | { name: string; category_id: number | null; stage: StartupStage; current_needs: Capability[] }
    | { name: string; category_id: number | null; stage: StartupStage; current_needs: Capability[] }[]
    | null
}

function toSignals(r: Row): FounderSignals {
  const startup = Array.isArray(r.startups) ? r.startups[0] ?? null : r.startups
  return {
    id: r.id,
    full_name: r.full_name,
    founder_role: r.founder_role,
    looking_for: r.looking_for ?? [],
    offers: r.offers ?? [],
    seeking_cofounder: r.seeking_cofounder,
    open_to_partnerships: r.open_to_partnerships,
    collaboration_types: r.collaboration_types ?? [],
    country: r.country,
    city: r.city,
    years_experience: r.years_experience,
    skills: r.profile_skills.filter((s) => s.kind === "has" && s.skills).map((s) => s.skills!),
    learning: r.profile_skills.filter((s) => s.kind === "learn" && s.skills).map((s) => s.skills!.name),
    interests: r.profile_interests.map((i) => i.category_id),
    startup: startup ?? null,
  }
}

export async function loadMatchContext(supabase: ServerClient): Promise<MatchContext> {
  const { data } = await supabase.from("categories").select("id, name")
  return { categoryNames: Object.fromEntries((data ?? []).map((c) => [c.id, c.name])) }
}

export async function loadSignals(supabase: ServerClient, ids: string[]): Promise<FounderSignals[]> {
  if (!ids.length) return []
  const { data, error } = await supabase.from("profiles").select(SIGNAL_SELECT).in("id", ids)
  if (error) throw error
  return (data as unknown as Row[]).map(toSignals)
}

async function loadCandidates(supabase: ServerClient, excludeIds: string[], limit = 600) {
  // Candidate pool: onboarded, active founders (RLS hides suspended/incomplete profiles),
  // most recently active first. For very large networks this pool can be pre-filtered
  // by shared interests/needs in SQL or replaced with a vector search.
  let q = supabase
    .from("profiles")
    .select(SIGNAL_SELECT)
    .eq("onboarding_completed", true)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(limit)
  if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`)
  const { data, error } = await q
  if (error) throw error
  return (data as unknown as Row[]).map(toSignals)
}

/** Live score between the current user and one other founder (used on profile pages). */
export async function matchWith(supabase: ServerClient, meId: string, otherId: string): Promise<MatchResult | null> {
  if (meId === otherId) return null
  const [ctx, signals] = await Promise.all([loadMatchContext(supabase), loadSignals(supabase, [meId, otherId])])
  const me = signals.find((s) => s.id === meId)
  const other = signals.find((s) => s.id === otherId)
  if (!me || !other) return null
  return scoreMatch(me, other, ctx)
}

const STALE_MS = 6 * 3600 * 1000

/**
 * Recomputes and stores recommendation snapshots for a user. Existing dismissals
 * are preserved. Announces strong new matches with a single notification.
 */
export async function refreshRecommendations(supabase: ServerClient, meId: string, opts: { force?: boolean } = {}) {
  const { data: latest } = await supabase
    .from("recommendations")
    .select("computed_at")
    .eq("profile_id", meId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data: meRow } = await supabase.from("profiles").select("updated_at").eq("id", meId).single()
  const fresh =
    latest &&
    Date.now() - new Date(latest.computed_at).getTime() < STALE_MS &&
    (!meRow || new Date(meRow.updated_at) <= new Date(latest.computed_at))
  if (fresh && !opts.force) return

  const { data: conns } = await supabase
    .from("connections")
    .select("requester_id, addressee_id, status")
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
  const connected = (conns ?? [])
    .filter((c) => c.status === "accepted")
    .map((c) => (c.requester_id === meId ? c.addressee_id : c.requester_id))

  const [ctx, [me], previous] = await Promise.all([
    loadMatchContext(supabase),
    loadSignals(supabase, [meId]),
    supabase.from("recommendations").select("target_id").eq("profile_id", meId),
  ])
  if (!me) return
  const candidates = await loadCandidates(supabase, [meId, ...connected])
  const ranked = rankMatches(me, candidates, ctx, { minScore: 15, limit: 40 })
  const now = new Date().toISOString()

  // Drop stale snapshots that no longer qualify (keep dismissals so they stay hidden).
  const keep = new Set(ranked.map((r) => r.targetId))
  const stale = (previous.data ?? []).map((p) => p.target_id).filter((id) => !keep.has(id))
  if (stale.length) {
    await supabase.from("recommendations").delete().eq("profile_id", meId).eq("status", "active").in("target_id", stale)
  }
  if (ranked.length) {
    await supabase.from("recommendations").upsert(
      ranked.map((r) => ({
        profile_id: meId,
        target_id: r.targetId,
        score: r.score,
        computed_at: now,
        reasons: {
          summary: r.summary,
          factors: r.factors,
          sharedInterests: r.sharedInterests,
          complementarySkills: r.complementarySkills,
          suggestion: r.suggestion,
        },
      })),
      { onConflict: "profile_id,target_id" }
    )
  }

  const before = new Set((previous.data ?? []).map((p) => p.target_id))
  const strongNew = ranked.filter((r) => r.score >= 60 && !before.has(r.targetId))
  if (latest && strongNew.length) {
    await supabase.from("notifications").insert({
      recipient_id: meId,
      type: "recommendation",
      title: `${strongNew.length} new strong founder ${strongNew.length === 1 ? "match" : "matches"}`,
      body: "Based on your updated profile and new members.",
      link: "/discover?tab=recommended",
    })
  }
}

export type StoredRecommendation = {
  target_id: string
  score: number
  reasons: Pick<MatchResult, "summary" | "factors" | "sharedInterests" | "complementarySkills" | "suggestion">
}
