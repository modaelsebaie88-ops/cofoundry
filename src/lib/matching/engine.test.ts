import { describe, expect, it } from "vitest"
import { DEFAULT_SCORERS, rankMatches, scoreMatch, type FounderSignals, type Scorer } from "./engine"

const ctx = { categoryNames: { 1: "AI & Machine Learning", 2: "Software & SaaS", 3: "HealthTech", 4: "FinTech" } }

function founder(p: Partial<FounderSignals> & { id: string }): FounderSignals {
  return {
    full_name: "Test Founder",
    founder_role: null,
    looking_for: [],
    offers: [],
    seeking_cofounder: false,
    open_to_partnerships: false,
    collaboration_types: [],
    country: null,
    city: null,
    years_experience: null,
    skills: [],
    learning: [],
    interests: [],
    startup: null,
    ...p,
  }
}

// The brief's example: an AI SaaS founder who needs a technical co-founder and marketing.
const aiFounder = founder({
  id: "me",
  full_name: "Ana Ramos",
  looking_for: ["engineering", "marketing"],
  offers: ["sales", "product"],
  seeking_cofounder: true,
  collaboration_types: ["cofounder", "advisory"],
  country: "Spain",
  city: "Madrid",
  skills: [{ name: "Product strategy", capability: "product" }],
  interests: [1, 2],
  startup: { name: "Clarity AI", category_id: 2, stage: "mvp", current_needs: ["engineering"] },
})

const fullStackDev = founder({
  id: "dev",
  full_name: "Dev Patel",
  offers: ["engineering"],
  looking_for: ["sales"],
  seeking_cofounder: true,
  collaboration_types: ["cofounder"],
  country: "Spain",
  years_experience: 8,
  skills: [
    { name: "Full-stack development", capability: "engineering" },
    { name: "LLM applications", capability: "data_ai" },
  ],
  interests: [1, 2],
  startup: { name: "Side project", category_id: 2, stage: "mvp", current_needs: [] },
})

const growthMarketer = founder({
  id: "mkt",
  full_name: "Mia Chen",
  offers: ["marketing"],
  skills: [{ name: "Growth marketing", capability: "marketing" }],
  interests: [2],
})

const unrelated = founder({
  id: "x",
  full_name: "Unrelated Person",
  offers: ["legal"],
  interests: [4],
  country: "Japan",
  startup: { name: "Other", category_id: 4, stage: "established", current_needs: ["legal"] },
})

describe("scoreMatch", () => {
  it("scores the AI SaaS → full-stack developer case highly and explains why", () => {
    const m = scoreMatch(aiFounder, fullStackDev, ctx)
    expect(m.score).toBeGreaterThanOrEqual(70)
    expect(m.summary).toMatch(/^Recommended because you're building Clarity AI in Software & SaaS/)
    expect(m.summary).toContain("Dev brings engineering")
    expect(m.summary).toContain("8 years of experience")
    expect(m.complementarySkills).toContain("Full-stack development")
    expect(m.sharedInterests).toEqual(["AI & Machine Learning", "Software & SaaS"])
    expect(m.suggestion).toMatch(/co-founder partnership/i)
  })

  it("ranks relevant collaborators above unrelated founders", () => {
    const ranked = rankMatches(aiFounder, [unrelated, growthMarketer, fullStackDev], ctx)
    expect(ranked.map((r) => r.targetId)).toEqual(["dev", "mkt", "x"])
    expect(ranked[2].score).toBeLessThan(15)
  })

  it("is deterministic and bounded to 0–100", () => {
    const a = scoreMatch(aiFounder, fullStackDev, ctx)
    const b = scoreMatch(aiFounder, fullStackDev, ctx)
    expect(a).toEqual(b)
    for (const other of [fullStackDev, growthMarketer, unrelated]) {
      const s = scoreMatch(aiFounder, other, ctx).score
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(100)
    }
  })

  it("the score equals the sum of factor points (transparent, no hidden weights)", () => {
    const m = scoreMatch(aiFounder, fullStackDev, ctx)
    const max = DEFAULT_SCORERS.reduce((a, s) => a + s.max, 0)
    const sum = m.factors.reduce((a, f) => a + f.points, 0)
    expect(max).toBe(100)
    expect(Math.abs(m.score - Math.round((sum / max) * 100))).toBeLessThanOrEqual(1)
    for (const f of m.factors) expect(f.points).toBeLessThanOrEqual(f.max)
  })

  it("gives zero points with honest explanations when data is missing", () => {
    const empty = founder({ id: "e" })
    const m = scoreMatch(empty, founder({ id: "f" }), ctx)
    expect(m.score).toBe(0)
    expect(m.factors.find((f) => f.key === "needs")?.detail).toMatch(/Add what you're looking for/)
  })

  it("treats skill capabilities as offers even when not declared explicitly", () => {
    const quietEngineer = founder({ id: "q", skills: [{ name: "Rust", capability: "engineering" }] })
    const m = scoreMatch(aiFounder, quietEngineer, ctx)
    expect(m.factors.find((f) => f.key === "needs")!.points).toBeGreaterThan(0)
  })

  it("supports pluggable scorers (e.g. future semantic similarity) and renormalises", () => {
    const semantic: Scorer = { key: "semantic", label: "Semantic similarity", max: 20, score: () => ({ points: 20, detail: "stub" }) }
    const base = scoreMatch(aiFounder, unrelated, ctx).score
    const withSemantic = scoreMatch(aiFounder, unrelated, ctx, [...DEFAULT_SCORERS, semantic]).score
    expect(withSemantic).toBeGreaterThan(base)
    expect(withSemantic).toBeLessThanOrEqual(100)
  })
})
