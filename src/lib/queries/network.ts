import "server-only"

import type { ServerClient } from "@/lib/supabase/server"

export type ConnectionState =
  | { status: "none" }
  | { status: "connected"; id: string }
  | { status: "outgoing"; id: string }
  | { status: "incoming"; id: string }

/** Map of other-profile-id → connection state for the current user. */
export async function getConnectionMap(supabase: ServerClient, meId: string) {
  const { data } = await supabase
    .from("connections")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
  const map = new Map<string, ConnectionState>()
  for (const c of data ?? []) {
    const other = c.requester_id === meId ? c.addressee_id : c.requester_id
    if (c.status === "accepted") map.set(other, { status: "connected", id: c.id })
    else if (c.status === "pending") map.set(other, { status: c.requester_id === meId ? "outgoing" : "incoming", id: c.id })
  }
  return map
}

export function connectionStateFor(map: Map<string, ConnectionState>, id: string): ConnectionState {
  return map.get(id) ?? { status: "none" }
}

export async function getSavedSet(supabase: ServerClient, meId: string, itemType: string) {
  const { data } = await supabase.from("saved_items").select("item_id").eq("profile_id", meId).eq("item_type", itemType)
  return new Set((data ?? []).map((d) => d.item_id))
}

export const FOUNDER_CARD_SELECT = `
  id, full_name, avatar_url, headline, country, city, founder_role, years_experience, is_verified, is_demo,
  looking_for, offers, seeking_cofounder,
  profile_skills ( kind, skills ( name ) ),
  startups!startups_owner_id_fkey ( name, slug, stage, logo_url, tagline, description, category_id, categories ( name ) )
`

export type FounderCardData = {
  id: string
  full_name: string
  avatar_url: string | null
  headline: string | null
  country: string | null
  city: string | null
  founder_role: string | null
  years_experience: number | null
  is_verified: boolean
  is_demo: boolean
  looking_for: string[]
  offers: string[]
  seeking_cofounder: boolean
  skills: string[]
  startup: {
    name: string
    slug: string
    stage: "idea" | "mvp" | "early_traction" | "growth" | "established"
    logo_url: string | null
    tagline: string | null
    description: string | null
    category: string | null
  } | null
}

type RawFounder = Omit<FounderCardData, "skills" | "startup"> & {
  profile_skills: { kind: string; skills: { name: string } | null }[]
  startups: unknown
}

export function toFounderCard(r: RawFounder): FounderCardData {
  const s = (Array.isArray(r.startups) ? r.startups[0] : r.startups) as
    | (Omit<NonNullable<FounderCardData["startup"]>, "category"> & { categories: { name: string } | null })
    | null
  const { profile_skills, startups: _s, ...rest } = r
  void _s
  return {
    ...rest,
    skills: profile_skills.filter((p) => p.kind === "has" && p.skills).map((p) => p.skills!.name),
    startup: s
      ? { name: s.name, slug: s.slug, stage: s.stage, logo_url: s.logo_url, tagline: s.tagline, description: s.description, category: s.categories?.name ?? null }
      : null,
  }
}
