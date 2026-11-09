/**
 * Cofoundry founder matching engine.
 *
 * Transparent and explainable: every point in a compatibility score comes from a
 * named factor computed from real profile data, and each factor produces a
 * human-readable reason. No randomness, no hidden weights.
 *
 * Extensible: additional scorers (e.g. embedding-based semantic similarity) can be
 * appended to `DEFAULT_SCORERS` or passed to `scoreMatch`. Scores are normalised
 * against the sum of max points, so adding a scorer keeps results on a 0–100 scale.
 */
import { CAPABILITIES, STAGES, type Capability, type CollabType, type StartupStage } from "@/lib/constants"

export type SkillSignal = { name: string; capability: Capability | null }

export type FounderSignals = {
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
  skills: SkillSignal[]
  learning: string[]
  interests: number[]
  startup: { name: string; category_id: number | null; stage: StartupStage; current_needs: Capability[] } | null
}

export type MatchContext = { categoryNames: Record<number, string> }

export type FactorResult = { key: string; label: string; points: number; max: number; detail: string }

export type MatchResult = {
  targetId: string
  score: number
  factors: FactorResult[]
  summary: string
  sharedInterests: string[]
  complementarySkills: string[]
  suggestion: string
}

export interface Scorer {
  key: string
  label: string
  max: number
  score(me: FounderSignals, them: FounderSignals, ctx: MatchContext): { points: number; detail: string }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
/** Lower-cases the first letter only, so acronyms survive ("Data & AI" → "data & AI"). */
const capLabel = (c: Capability) => {
  const l = CAPABILITIES[c].label
  return l.charAt(0).toLowerCase() + l.slice(1)
}

export function listify(items: string[], max = 3): string {
  const xs = items.slice(0, max)
  if (items.length > max) xs.push(`${items.length - max} more`)
  if (xs.length <= 1) return xs.join("")
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`
}

/** Everything a founder needs: their own "looking for" plus their startup's current needs. */
export function needsOf(f: FounderSignals): Capability[] {
  return [...new Set([...f.looking_for, ...(f.startup?.current_needs ?? [])])]
}

/** What a founder can provide: declared offers plus capabilities implied by their skills. */
export function capabilitiesOf(f: FounderSignals): Capability[] {
  const fromSkills = f.skills.map((s) => s.capability).filter((c): c is Capability => Boolean(c))
  return [...new Set([...f.offers, ...fromSkills])]
}

const TECHNICAL: Capability[] = ["engineering", "data_ai"]
const isTechnical = (f: FounderSignals) => capabilitiesOf(f).some((c) => TECHNICAL.includes(c))

function relevantSkills(me: FounderSignals, them: FounderSignals) {
  const mine = new Set(me.skills.map((s) => s.name.toLowerCase()))
  const wanted = new Set(me.learning.map((s) => s.toLowerCase()))
  const needs = new Set(needsOf(me))
  const relevant: string[] = []
  const other: string[] = []
  for (const s of them.skills) {
    const key = s.name.toLowerCase()
    if (mine.has(key)) continue
    if (wanted.has(key) || (s.capability && needs.has(s.capability))) relevant.push(s.name)
    else other.push(s.name)
  }
  return { relevant, other }
}

function sharedInterestNames(me: FounderSignals, them: FounderSignals, ctx: MatchContext) {
  const theirs = new Set(them.interests)
  return me.interests.filter((i) => theirs.has(i)).map((i) => ctx.categoryNames[i]).filter(Boolean)
}

// ---------------------------------------------------------------------------
// scorers
// ---------------------------------------------------------------------------
export const needsScorer: Scorer = {
  key: "needs",
  label: "Covers what you need",
  max: 28,
  score(me, them) {
    const needs = needsOf(me)
    if (!needs.length) return { points: 0, detail: "Add what you're looking for to your profile to unlock this factor." }
    const offers = new Set(capabilitiesOf(them))
    const covered = needs.filter((n) => offers.has(n))
    if (!covered.length) return { points: 0, detail: "Doesn't cover what you're currently looking for." }
    return {
      points: (this.max * covered.length) / needs.length,
      detail: `Brings ${listify(covered.map(capLabel))} — ${covered.length} of the ${needs.length} areas you need.`,
    }
  },
}

export const reciprocityScorer: Scorer = {
  key: "reciprocity",
  label: "You can help them",
  max: 10,
  score(me, them) {
    const theirNeeds = needsOf(them)
    if (!theirNeeds.length) return { points: 0, detail: "They haven't listed what they're looking for." }
    const mine = new Set(capabilitiesOf(me))
    const covered = theirNeeds.filter((n) => mine.has(n))
    if (!covered.length) return { points: 0, detail: "You don't currently offer what they're looking for." }
    return {
      points: (this.max * covered.length) / theirNeeds.length,
      detail: `They're looking for ${listify(covered.map(capLabel))}, which you offer.`,
    }
  },
}

export const skillsScorer: Scorer = {
  key: "skills",
  label: "Complementary skills",
  max: 14,
  score(me, them) {
    const { relevant, other } = relevantSkills(me, them)
    const points = Math.min(this.max, relevant.length * 5 + Math.min(other.length, 4))
    if (!relevant.length && !other.length) return { points: 0, detail: "No complementary skills listed." }
    return {
      points,
      detail: relevant.length
        ? `Skilled in ${listify(relevant)}, which you need or want to learn.`
        : `Adds skills you don't have: ${listify(other)}.`,
    }
  },
}

export const industryScorer: Scorer = {
  key: "industry",
  label: "Industry fit",
  max: 14,
  score(me, them, ctx) {
    const myCat = me.startup?.category_id ?? null
    const theirCat = them.startup?.category_id ?? null
    if (myCat && theirCat && myCat === theirCat) {
      return { points: this.max, detail: `Both building in ${ctx.categoryNames[myCat] ?? "the same industry"}.` }
    }
    if (myCat && them.interests.includes(myCat)) {
      return { points: 9, detail: `Interested in ${ctx.categoryNames[myCat] ?? "your industry"}, where you're building.` }
    }
    if (theirCat && me.interests.includes(theirCat)) {
      return { points: 9, detail: `Building in ${ctx.categoryNames[theirCat] ?? "an industry"} you're interested in.` }
    }
    return { points: 0, detail: "Working in different industries." }
  },
}

export const interestsScorer: Scorer = {
  key: "interests",
  label: "Shared interests",
  max: 10,
  score(me, them, ctx) {
    if (!me.interests.length || !them.interests.length) return { points: 0, detail: "Not enough interest data." }
    const shared = sharedInterestNames(me, them, ctx)
    const union = new Set([...me.interests, ...them.interests]).size
    if (!shared.length) return { points: 0, detail: "No overlapping interests yet." }
    return { points: (this.max * shared.length) / union, detail: `You both follow ${listify(shared)}.` }
  },
}

export const stageScorer: Scorer = {
  key: "stage",
  label: "Stage compatibility",
  max: 8,
  score(me, them) {
    if (!me.startup || !them.startup) return { points: 0, detail: "Stage unknown for one of you." }
    const a = STAGES[me.startup.stage].order
    const b = STAGES[them.startup.stage].order
    const seekingGuidance = needsOf(me).some((n) => n === "mentorship" || n === "fundraising")
    if (seekingGuidance && b - a >= 2) {
      return { points: this.max, detail: `They've reached ${STAGES[them.startup.stage].label} — experience you can learn from.` }
    }
    if (a === b) return { points: this.max, detail: `Both at the ${STAGES[me.startup.stage].label} stage, facing similar challenges.` }
    if (Math.abs(a - b) === 1) return { points: 5, detail: "At adjacent stages — close enough to share playbooks." }
    return { points: 0, detail: "At quite different stages." }
  },
}

export const cofounderScorer: Scorer = {
  key: "cofounder",
  label: "Co-founder intent",
  max: 7,
  score(me, them) {
    if (!me.seeking_cofounder || !them.seeking_cofounder) {
      return { points: 0, detail: me.seeking_cofounder ? "They aren't looking for a co-founder." : "Not a co-founder search." }
    }
    if (isTechnical(me) !== isTechnical(them)) {
      return { points: this.max, detail: "You're both looking for a co-founder with a complementary technical/business split." }
    }
    return { points: 3, detail: "You're both open to co-founding, with similar backgrounds." }
  },
}

export const collabScorer: Scorer = {
  key: "collaboration",
  label: "Collaboration preferences",
  max: 5,
  score(me, them) {
    const theirs = new Set(them.collaboration_types)
    const overlap = me.collaboration_types.filter((c) => theirs.has(c))
    const partnership = me.open_to_partnerships && them.open_to_partnerships
    const points = Math.min(this.max, overlap.length * 2.5 + (partnership ? 1 : 0))
    if (!points) return { points: 0, detail: "Different collaboration preferences." }
    return {
      points,
      detail: overlap.length
        ? `Open to the same kinds of collaboration (${overlap.length} in common).`
        : "Both open to partnerships.",
    }
  },
}

export const locationScorer: Scorer = {
  key: "location",
  label: "Location",
  max: 4,
  score(me, them) {
    const same = (a: string | null, b: string | null) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase())
    if (same(me.country, them.country) && same(me.city, them.city)) return { points: 4, detail: `Both based in ${them.city}.` }
    if (same(me.country, them.country)) return { points: 2, detail: `Both based in ${them.country}.` }
    return { points: 0, detail: "Based in different countries." }
  },
}

export const DEFAULT_SCORERS: Scorer[] = [
  needsScorer, reciprocityScorer, skillsScorer, industryScorer, interestsScorer,
  stageScorer, cofounderScorer, collabScorer, locationScorer,
]

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------
export function scoreMatch(
  me: FounderSignals,
  them: FounderSignals,
  ctx: MatchContext,
  scorers: Scorer[] = DEFAULT_SCORERS
): MatchResult {
  const factors = scorers.map((s) => {
    const r = s.score(me, them, ctx)
    return { key: s.key, label: s.label, max: s.max, points: Math.round(r.points * 10) / 10, detail: r.detail }
  })
  const maxTotal = scorers.reduce((a, s) => a + s.max, 0)
  const total = factors.reduce((a, f) => a + f.points, 0)
  const score = Math.max(0, Math.min(100, Math.round((total / maxTotal) * 100)))

  const { relevant, other } = relevantSkills(me, them)
  const sharedInterests = sharedInterestNames(me, them, ctx)

  return {
    targetId: them.id,
    score,
    factors,
    summary: buildSummary(me, them, factors, ctx, relevant),
    sharedInterests,
    complementarySkills: [...relevant, ...other].slice(0, 6),
    suggestion: buildSuggestion(me, them, factors),
  }
}

export function rankMatches(
  me: FounderSignals,
  candidates: FounderSignals[],
  ctx: MatchContext,
  opts: { minScore?: number; limit?: number; scorers?: Scorer[] } = {}
): MatchResult[] {
  return candidates
    .filter((c) => c.id !== me.id)
    .map((c) => scoreMatch(me, c, ctx, opts.scorers))
    .filter((m) => m.score >= (opts.minScore ?? 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 50)
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "This founder"
}

function buildSummary(
  me: FounderSignals,
  them: FounderSignals,
  factors: FactorResult[],
  ctx: MatchContext,
  relevantSkillNames: string[]
): string {
  const f = (k: string) => factors.find((x) => x.key === k)!
  const myNeeds = needsOf(me)
  const theirCaps = new Set(capabilitiesOf(them))
  const covered = myNeeds.filter((n) => theirCaps.has(n))

  const myCat = me.startup?.category_id ? ctx.categoryNames[me.startup.category_id] : null
  let context = me.startup
    ? `you're building ${me.startup.name}${myCat ? ` in ${myCat}` : ""}`
    : "of your interests"
  if (myNeeds.length && me.startup) context += ` and need ${listify(myNeeds.map(capLabel), 2)}`

  const name = firstName(them.full_name)
  const theirCat = them.startup?.category_id ? ctx.categoryNames[them.startup.category_id] : null
  let contribution: string
  if (covered.length) {
    contribution = `${name} brings ${listify(covered.map(capLabel), 2)}`
    if (relevantSkillNames.length) contribution += ` — skilled in ${listify(relevantSkillNames.slice(0, 2), 2)}`
  } else if (relevantSkillNames.length) {
    contribution = `${name} is skilled in ${listify(relevantSkillNames.slice(0, 2), 2)}`
  } else if (f("industry").points > 0 && theirCat) {
    contribution = `${name} is also building in ${theirCat}`
  } else if (f("stage").points > 0 && them.startup) {
    contribution = `${name} is at the ${STAGES[them.startup.stage].label} stage too`
  } else if (f("interests").points > 0) {
    contribution = `${name} shares your interests`
  } else {
    contribution = `${name}'s profile complements yours`
  }
  if (them.years_experience && them.years_experience >= 5) contribution += `, with ${them.years_experience} years of experience`
  return `Recommended because ${context}, and ${contribution}.`
}

function buildSuggestion(me: FounderSignals, them: FounderSignals, factors: FactorResult[]): string {
  const pts = (k: string) => factors.find((x) => x.key === k)?.points ?? 0
  const theirCaps = new Set(capabilitiesOf(them))
  const myCaps = new Set(capabilitiesOf(me))
  const covered = needsOf(me).filter((n) => theirCaps.has(n))
  const reciprocal = needsOf(them).filter((n) => myCaps.has(n))

  if (pts("cofounder") >= 7) return "Explore a co-founder partnership — start with a short trial project together."
  if (covered.length && reciprocal.length) {
    return `Skill exchange: you help with ${capLabel(reciprocal[0])}, they help with ${capLabel(covered[0])}.`
  }
  if (covered.length) {
    const advisory = them.collaboration_types.includes("advisory") || covered.includes("mentorship")
    return advisory
      ? `Ask for advice on ${capLabel(covered[0])} — they're open to advisory roles.`
      : `Bring them in as a ${capLabel(covered[0])} collaborator on your next milestone.`
  }
  if (reciprocal.length) return `Offer your ${capLabel(reciprocal[0])} expertise — they're looking for it.`
  if (pts("industry") > 0) return "Swap notes on what's working in your industry."
  return "Start a conversation about your shared interests."
}
