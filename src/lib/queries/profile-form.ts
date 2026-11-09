import "server-only"

import type { ServerClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/auth"
import type {
  CollaborationValues,
  FounderValues,
  PersonalValues,
  StartupValues,
} from "@/components/profile/profile-forms"
import { emptyStartup } from "@/components/profile/profile-forms"

export async function loadProfileFormData(supabase: ServerClient, profile: Profile) {
  const [{ data: categories }, { data: skills }, { data: mySkills }, { data: interests }, { data: startup }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("skills").select("name").order("name").limit(1000),
    supabase.from("profile_skills").select("kind, skills(name)").eq("profile_id", profile.id),
    supabase.from("profile_interests").select("category_id").eq("profile_id", profile.id),
    supabase.from("startups").select("*").eq("owner_id", profile.id).maybeSingle(),
  ])

  const personal: PersonalValues = {
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    headline: profile.headline,
    country: profile.country,
    city: profile.city,
    linkedin_url: profile.linkedin_url,
    website_url: profile.website_url,
    bio: profile.bio,
  }
  const founder: FounderValues = {
    founder_role: profile.founder_role,
    years_experience: profile.years_experience,
    previous_experience: profile.previous_experience,
    help_topics: profile.help_topics ?? [],
    skills: (mySkills ?? []).filter((s) => s.kind === "has" && s.skills).map((s) => s.skills!.name),
    learning: (mySkills ?? []).filter((s) => s.kind === "learn" && s.skills).map((s) => s.skills!.name),
    interests: (interests ?? []).map((i) => i.category_id),
  }
  const collaboration: CollaborationValues = {
    looking_for: profile.looking_for ?? [],
    offers: profile.offers ?? [],
    seeking_cofounder: profile.seeking_cofounder,
    open_to_partnerships: profile.open_to_partnerships,
    collaboration_types: profile.collaboration_types ?? [],
    availability: profile.availability,
  }
  const startupValues: StartupValues | null = startup
    ? {
        name: startup.name,
        tagline: startup.tagline,
        description: startup.description,
        logo_url: startup.logo_url,
        cover_url: startup.cover_url,
        category_id: startup.category_id,
        stage: startup.stage,
        website_url: startup.website_url,
        target_market: startup.target_market,
        business_model: startup.business_model,
        team_size: startup.team_size,
        mission: startup.mission,
        vision: startup.vision,
        products: startup.products,
        current_needs: startup.current_needs ?? [],
        location: startup.location,
        founded_year: startup.founded_year,
        twitter_url: startup.twitter_url,
        linkedin_url: startup.linkedin_url,
      }
    : null

  return {
    categories: categories ?? [],
    skillSuggestions: (skills ?? []).map((s) => s.name),
    personal,
    founder,
    collaboration,
    startup: startupValues,
    startupRow: startup,
    emptyStartup,
  }
}
