"use server"

import { revalidatePath } from "next/cache"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"
import { refreshRecommendations } from "@/lib/matching/service"
import type { ServerClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils"
import {
  collaborationSchema,
  founderSchema,
  personalSchema,
  startupSchema,
  zodFieldErrors,
} from "@/lib/validation"

type Fail = { ok: false; error: string; fieldErrors?: Record<string, string> }
const invalid = (fieldErrors: Record<string, string>): Fail => ({
  ok: false,
  error: "Please fix the highlighted fields.",
  fieldErrors,
})

export async function savePersonal(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = personalSchema.safeParse(input)
    if (!parsed.success) return invalid(zodFieldErrors(parsed.error))
    const { supabase, user } = await actionContext()
    check(await supabase.from("profiles").update(parsed.data).eq("id", user.id))
    revalidatePath("/", "layout")
    return { ok: true as const }
  })
}

/** Resolves skill names to ids, creating new skills when needed. */
async function resolveSkills(supabase: ServerClient, names: string[]) {
  const unique = [...new Map(names.map((n) => [n.trim().toLowerCase(), n.trim()])).values()].filter(Boolean)
  if (!unique.length) return []
  const { data: existing } = await supabase.from("skills").select("id, name").in("name", unique)
  const found = new Map((existing ?? []).map((s) => [s.name.toLowerCase(), s.id]))
  const missing = unique.filter((n) => !found.has(n.toLowerCase()))
  if (missing.length) {
    const { data: created } = await supabase
      .from("skills")
      .upsert(missing.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true })
      .select("id, name")
    for (const s of created ?? []) found.set(s.name.toLowerCase(), s.id)
    // ignoreDuplicates hides rows created concurrently; fetch any still missing
    const still = missing.filter((n) => !found.has(n.toLowerCase()))
    if (still.length) {
      const { data } = await supabase.from("skills").select("id, name").in("name", still)
      for (const s of data ?? []) found.set(s.name.toLowerCase(), s.id)
    }
  }
  return unique.map((n) => found.get(n.toLowerCase())).filter((x): x is number => typeof x === "number")
}

export async function saveFounder(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = founderSchema.safeParse(input)
    if (!parsed.success) return invalid(zodFieldErrors(parsed.error))
    const { supabase, user } = await actionContext()
    const d = parsed.data
    check(
      await supabase
        .from("profiles")
        .update({
          founder_role: d.founder_role,
          years_experience: d.years_experience,
          previous_experience: d.previous_experience,
          help_topics: d.help_topics,
        })
        .eq("id", user.id)
    )
    const [hasIds, learnIds] = await Promise.all([resolveSkills(supabase, d.skills), resolveSkills(supabase, d.learning)])
    check(await supabase.from("profile_skills").delete().eq("profile_id", user.id))
    const rows = [
      ...hasIds.map((skill_id) => ({ profile_id: user.id, skill_id, kind: "has" })),
      ...learnIds.map((skill_id) => ({ profile_id: user.id, skill_id, kind: "learn" })),
    ]
    if (rows.length) check(await supabase.from("profile_skills").insert(rows))
    check(await supabase.from("profile_interests").delete().eq("profile_id", user.id))
    check(await supabase.from("profile_interests").insert(d.interests.map((category_id) => ({ profile_id: user.id, category_id }))))
    revalidatePath("/", "layout")
    return { ok: true as const }
  })
}

export async function saveCollaboration(input: unknown, opts: { completeOnboarding?: boolean } = {}): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = collaborationSchema.safeParse(input)
    if (!parsed.success) return invalid(zodFieldErrors(parsed.error))
    const { supabase, user } = await actionContext()
    const update = {
      ...parsed.data,
      looking_for: parsed.data.looking_for as never,
      offers: parsed.data.offers as never,
      collaboration_types: parsed.data.collaboration_types as never,
      availability: parsed.data.availability as never,
      ...(opts.completeOnboarding ? { onboarding_completed: true } : {}),
    }
    check(await supabase.from("profiles").update(update).eq("id", user.id))

    if (opts.completeOnboarding) {
      // Product decision: auto-join the communities for the industries a founder picked,
      // so their feed is useful from minute one. They can leave any time.
      const { data: interests } = await supabase.from("profile_interests").select("category_id").eq("profile_id", user.id)
      const { data: startup } = await supabase.from("startups").select("category_id").eq("owner_id", user.id).maybeSingle()
      const catIds = [...new Set([...(interests ?? []).map((i) => i.category_id), startup?.category_id].filter(Boolean))] as number[]
      if (catIds.length) {
        const { data: comms } = await supabase.from("communities").select("id").in("category_id", catIds)
        if (comms?.length) {
          await supabase
            .from("community_members")
            .upsert(comms.map((c) => ({ community_id: c.id, profile_id: user.id })), {
              onConflict: "community_id,profile_id",
              ignoreDuplicates: true,
            })
        }
      }
      await refreshRecommendations(supabase, user.id, { force: true }).catch(() => {})
    }
    revalidatePath("/", "layout")
    return { ok: true as const }
  })
}

export async function saveStartup(input: unknown): Promise<ActionResult<{ slug: string }>> {
  return runAction(async () => {
    const parsed = startupSchema.safeParse(input)
    if (!parsed.success) return invalid(zodFieldErrors(parsed.error))
    const { supabase, user } = await actionContext()
    const d = { ...parsed.data, current_needs: parsed.data.current_needs as never, stage: parsed.data.stage as never }
    const { data: existing } = await supabase.from("startups").select("id, slug").eq("owner_id", user.id).maybeSingle()
    let slug = existing?.slug
    if (existing) {
      check(await supabase.from("startups").update(d).eq("id", existing.id))
    } else {
      const base = slugify(d.name) || "startup"
      slug = base.length >= 2 ? base : `${base}-co`
      for (let i = 0; i < 5; i++) {
        const { error } = await supabase.from("startups").insert({ ...d, owner_id: user.id, slug })
        if (!error) break
        if (!/duplicate key/.test(error.message) || i === 4) throw new Error(error.message)
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
      }
    }
    revalidatePath("/", "layout")
    return { ok: true as const, data: { slug: slug! } }
  })
}

export async function deleteStartup(): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    check(await supabase.from("startups").delete().eq("owner_id", user.id))
    revalidatePath("/", "layout")
    return { ok: true as const }
  })
}

export async function addMilestone(input: { title: string; description?: string; achieved_on?: string }): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    const title = input.title?.trim()
    if (!title || title.length > 140) return { ok: false as const, error: "Enter a milestone title (max 140 characters)." }
    const { data: s } = await supabase.from("startups").select("id").eq("owner_id", user.id).single()
    if (!s) return { ok: false as const, error: "Create your startup first." }
    check(
      await supabase.from("startup_milestones").insert({
        startup_id: s.id,
        title,
        description: input.description?.trim() || null,
        achieved_on: input.achieved_on || null,
      })
    )
    revalidatePath("/startup")
    return { ok: true as const }
  })
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("startup_milestones").delete().eq("id", id))
    revalidatePath("/startup")
    return { ok: true as const }
  })
}

export async function addTeamMember(profileId: string, title: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    const { data: s } = await supabase.from("startups").select("id").eq("owner_id", user.id).single()
    if (!s) return { ok: false as const, error: "Create your startup first." }
    const { error } = await supabase
      .from("startup_members")
      .insert({ startup_id: s.id, profile_id: profileId, title: title.trim().slice(0, 80) || null })
    if (error) {
      return {
        ok: false as const,
        error: /row-level/.test(error.message) ? "You can only add founders you're connected with." : error.message,
      }
    }
    revalidatePath("/startup")
    return { ok: true as const }
  })
}

export async function removeTeamMember(profileId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    const { data: s } = await supabase.from("startups").select("id").eq("owner_id", user.id).single()
    if (!s) return { ok: false as const, error: "No startup found." }
    check(await supabase.from("startup_members").delete().eq("startup_id", s.id).eq("profile_id", profileId))
    revalidatePath("/startup")
    return { ok: true as const }
  })
}

export async function saveNotificationPrefs(prefs: Record<string, boolean>): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    check(
      await supabase
        .from("notification_preferences")
        .upsert({ profile_id: user.id, prefs, updated_at: new Date().toISOString() })
    )
    return { ok: true as const }
  })
}
