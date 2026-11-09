import "server-only"

import type { Capability, OpportunityType } from "@/lib/constants"
import type { ServerClient } from "@/lib/supabase/server"

export const OPPORTUNITY_LIST_SELECT = `
  id, type, title, description, required_skills, stage, collaboration_type, location, is_remote, status,
  application_count, created_at, category_id,
  categories ( name ),
  author:profiles!opportunities_author_id_fkey ( id, full_name, avatar_url, headline, is_verified, is_demo ),
  startup:startups ( name, slug, logo_url )
`

/** The capability a person needs to have to respond to each opportunity type. */
export const OPPORTUNITY_CAPABILITY: Partial<Record<OpportunityType, Capability>> = {
  developer: "engineering",
  designer: "design",
  marketing: "marketing",
  business_partner: "business_development",
  mentor: "mentorship",
  investor: "investment",
}

type Me = {
  id: string
  offers: Capability[]
  looking_for: Capability[]
  seeking_cofounder: boolean
  open_to_partnerships: boolean
  skills: string[]
  interests: number[]
}

/**
 * Ranks open opportunities by relevance to the current founder: ones they can
 * fill (type ↔ offers, skill overlap), in industries they care about, and ones
 * offering what they're looking for.
 */
export async function suggestOpportunities(supabase: ServerClient, me: Me, limit = 4) {
  const { data } = await supabase
    .from("opportunities")
    .select(OPPORTUNITY_LIST_SELECT)
    .eq("status", "open")
    .neq("author_id", me.id)
    .order("created_at", { ascending: false })
    .limit(200)
  const mySkills = new Set(me.skills.map((s) => s.toLowerCase()))
  const offers = new Set(me.offers)
  const scored = (data ?? []).map((o) => {
    let score = 0
    const reasons: string[] = []
    const cap = OPPORTUNITY_CAPABILITY[o.type]
    if (cap && offers.has(cap)) {
      score += 5
      reasons.push("matches what you offer")
    }
    if (o.type === "cofounder" && me.seeking_cofounder) {
      score += 5
      reasons.push("you're open to co-founding")
    }
    if (o.type === "partnership" && me.open_to_partnerships) {
      score += 3
      reasons.push("you're open to partnerships")
    }
    if (o.type === "services_offered" && me.looking_for.length) {
      score += 1
    }
    const overlap = (o.required_skills ?? []).filter((s) => mySkills.has(s.toLowerCase()))
    if (overlap.length) {
      score += overlap.length * 3
      reasons.push(`uses your skills: ${overlap.slice(0, 2).join(", ")}`)
    }
    if (o.category_id && me.interests.includes(o.category_id)) {
      score += 2
      reasons.push("in an industry you follow")
    }
    return { ...o, relevance: score, reason: reasons[0] ?? null }
  })
  return scored
    .filter((o) => o.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, limit)
}
