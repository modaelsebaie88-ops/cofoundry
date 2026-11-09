/**
 * Deterministic, rule-based insights computed from profile data. These are shown
 * as "Profile insights" — they are not AI generated.
 */
import { CAPABILITIES, STAGES, type Capability, type StartupStage } from "@/lib/constants"

type CompletenessInput = {
  profile: {
    full_name: string
    avatar_url: string | null
    headline: string | null
    bio: string | null
    country: string | null
    linkedin_url: string | null
    looking_for: string[]
    offers: string[]
    availability: string | null
  }
  hasStartup: boolean
  startupHasLogo: boolean
  startupHasDescription: boolean
  skillsCount: number
  interestsCount: number
}

export function profileCompleteness(i: CompletenessInput) {
  const checks: { label: string; done: boolean; href: string; weight: number }[] = [
    { label: "Add your name", done: Boolean(i.profile.full_name), href: "/settings/profile", weight: 8 },
    { label: "Upload a profile photo", done: Boolean(i.profile.avatar_url), href: "/settings/profile", weight: 10 },
    { label: "Write a professional headline", done: Boolean(i.profile.headline), href: "/settings/profile", weight: 10 },
    { label: "Write a short bio", done: Boolean(i.profile.bio && i.profile.bio.length > 40), href: "/settings/profile", weight: 10 },
    { label: "Add your location", done: Boolean(i.profile.country), href: "/settings/profile", weight: 5 },
    { label: "Link your LinkedIn", done: Boolean(i.profile.linkedin_url), href: "/settings/profile", weight: 5 },
    { label: "Add at least 3 skills", done: i.skillsCount >= 3, href: "/settings/profile#skills", weight: 12 },
    { label: "Pick your industries of interest", done: i.interestsCount >= 1, href: "/settings/profile#interests", weight: 8 },
    { label: "Say what you're looking for", done: i.profile.looking_for.length > 0, href: "/settings/profile#collaboration", weight: 10 },
    { label: "Say what you can offer", done: i.profile.offers.length > 0, href: "/settings/profile#collaboration", weight: 7 },
    { label: "Set your availability", done: Boolean(i.profile.availability), href: "/settings/profile#collaboration", weight: 3 },
    { label: "Create your startup profile", done: i.hasStartup, href: "/startup", weight: 7 },
    { label: "Describe your startup and add a logo", done: i.startupHasDescription && i.startupHasLogo, href: "/startup", weight: 5 },
  ]
  const total = checks.reduce((a, c) => a + c.weight, 0)
  const score = Math.round((checks.filter((c) => c.done).reduce((a, c) => a + c.weight, 0) / total) * 100)
  return { score, missing: checks.filter((c) => !c.done) }
}

/** Which needed capabilities are not covered by anyone on the founding team. */
export function teamGaps(needs: Capability[], teamCapabilities: Capability[]) {
  const have = new Set(teamCapabilities)
  const essentials: Capability[] = ["engineering", "product", "sales", "marketing"]
  const declaredGaps = needs.filter((n) => !have.has(n))
  const essentialGaps = essentials.filter((e) => !have.has(e) && !declaredGaps.includes(e))
  return {
    declaredGaps,
    essentialGaps,
    covered: [...have].map((c) => CAPABILITIES[c].label),
  }
}

export const STAGE_PLAYBOOK: Record<StartupStage, { focus: string; challenges: string[] }> = {
  idea: {
    focus: "Validate that the problem is painful and frequent before building.",
    challenges: [
      "Building before validating demand — run 15–20 problem interviews first.",
      "Choosing a co-founder too quickly — test working together on a small project.",
      "Defining a segment that's too broad to reach efficiently.",
    ],
  },
  mvp: {
    focus: "Ship the smallest product that delivers the core outcome and get it in users' hands.",
    challenges: [
      "Scope creep delaying launch — cut features that don't serve the core job.",
      "Measuring vanity metrics instead of activation and retention.",
      "Underinvesting in onboarding for your first users.",
    ],
  },
  early_traction: {
    focus: "Find a repeatable acquisition channel and prove retention.",
    challenges: [
      "Spreading effort across too many channels — double down on one or two.",
      "Hiring before the founder-led sales motion is understood.",
      "Raising without clear metrics on growth and retention.",
    ],
  },
  growth: {
    focus: "Scale what works while building the team and processes to sustain it.",
    challenges: [
      "Culture and communication breaking as the team grows.",
      "Unit economics deteriorating with paid acquisition.",
      "Founders staying the bottleneck for decisions.",
    ],
  },
  established: {
    focus: "Expand into new markets or products without losing the core.",
    challenges: [
      "Innovation slowing as processes harden.",
      "Competition from focused newcomers in your core segment.",
      "Managing a portfolio of products and priorities.",
    ],
  },
}

export function stageLabel(stage: StartupStage) {
  return STAGES[stage].label
}
