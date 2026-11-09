import "server-only"

import type { MatchReasons } from "@/components/network/match-card"
import { refreshRecommendations } from "@/lib/matching/service"
import { FOUNDER_CARD_SELECT, toFounderCard, type FounderCardData } from "@/lib/queries/network"
import type { ServerClient } from "@/lib/supabase/server"

export type Recommendation = { founder: FounderCardData; score: number; reasons: MatchReasons }

/** Ensures snapshots are fresh, then returns the top active recommendations with profile data. */
export async function getRecommendations(supabase: ServerClient, meId: string, limit = 12): Promise<Recommendation[]> {
  await refreshRecommendations(supabase, meId).catch((e) => console.error("refreshRecommendations", e))
  const { data: recs } = await supabase
    .from("recommendations")
    .select("target_id, score, reasons")
    .eq("profile_id", meId)
    .eq("status", "active")
    .order("score", { ascending: false })
    .limit(limit)
  if (!recs?.length) return []
  const { data: profiles } = await supabase
    .from("profiles")
    .select(FOUNDER_CARD_SELECT)
    .in("id", recs.map((r) => r.target_id))
  const byId = new Map((profiles ?? []).map((p) => [p.id, toFounderCard(p as never)]))
  return recs
    .filter((r) => byId.has(r.target_id))
    .map((r) => ({ founder: byId.get(r.target_id)!, score: r.score, reasons: r.reasons as unknown as MatchReasons }))
}
