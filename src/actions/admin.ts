"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"
import { RESOURCE_CATEGORY_KEYS } from "@/lib/constants"
import { slugify } from "@/lib/utils"

/** Every admin action re-checks the role server-side; RLS enforces it again in the database. */
async function adminContext() {
  const ctx = await actionContext()
  const { data } = await ctx.supabase.rpc("is_admin")
  if (!data) throw new Error("Administrator access required.")
  return ctx
}

export async function setUserRole(userId: string, role: "founder" | "mentor" | "moderator" | "admin"): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await adminContext()
    if (userId === user.id && role !== "admin") return { ok: false, error: "You can't remove your own admin role." }
    check(await supabase.from("profiles").update({ role }).eq("id", userId))
    revalidatePath("/admin/users")
    return { ok: true, message: "Role updated" }
  })
}

export async function setSuspended(userId: string, suspended: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await adminContext()
    if (userId === user.id) return { ok: false, error: "You can't suspend yourself." }
    check(await supabase.from("profiles").update({ is_suspended: suspended }).eq("id", userId))
    revalidatePath("/admin/users")
    return { ok: true, message: suspended ? "User suspended" : "User reinstated" }
  })
}

export async function reviewVerification(id: string, approve: boolean, note: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await adminContext()
    check(await supabase.from("verification_requests").update({ status: approve ? "approved" : "rejected", review_note: note.trim().slice(0, 1000) || null }).eq("id", id))
    revalidatePath("/admin/verification")
    return { ok: true, message: approve ? "Verification approved" : "Verification rejected" }
  })
}

export async function revokeVerification(target: "profile" | "startup", id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await adminContext()
    if (target === "profile") check(await supabase.from("profiles").update({ is_verified: false }).eq("id", id))
    else check(await supabase.from("startups").update({ is_verified: false }).eq("id", id))
    revalidatePath("/admin", "layout")
    return { ok: true, message: "Verification revoked" }
  })
}

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().min(1).max(40),
})

export async function createCategory(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Enter a name (2–80 characters)." }
    const { supabase } = await adminContext()
    const { count } = await supabase.from("categories").select("id", { count: "exact", head: true })
    const { error } = await supabase.from("categories").insert({ ...parsed.data, slug: slugify(parsed.data.name), sort_order: (count ?? 0) + 1 })
    if (error) return { ok: false, error: /duplicate/.test(error.message) ? "A category with that name already exists." : error.message }
    revalidatePath("/admin/categories")
    return { ok: true, message: "Category created with its community" }
  })
}

export async function updateCategory(id: number, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Invalid category." }
    const { supabase } = await adminContext()
    check(await supabase.from("categories").update(parsed.data).eq("id", id))
    revalidatePath("/admin/categories")
    return { ok: true, message: "Category updated" }
  })
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await adminContext()
    check(await supabase.from("categories").delete().eq("id", id))
    revalidatePath("/admin/categories")
    return { ok: true, message: "Category deleted (its community was kept)" }
  })
}

export async function saveCommunity(id: string | null, input: { name: string; description: string; rules: string; icon: string }): Promise<ActionResult> {
  return runAction(async () => {
    const name = input.name.trim()
    if (name.length < 2) return { ok: false, error: "Enter a community name." }
    const { supabase } = await adminContext()
    const row = { name, description: input.description.trim() || null, rules: input.rules.trim() || null, icon: input.icon || "users" }
    if (id) check(await supabase.from("communities").update(row).eq("id", id))
    else {
      const { error } = await supabase.from("communities").insert({ ...row, slug: slugify(name) })
      if (error) return { ok: false, error: /duplicate/.test(error.message) ? "A community with that slug already exists." : error.message }
    }
    revalidatePath("/admin/communities")
    revalidatePath("/communities")
    return { ok: true, message: id ? "Community updated" : "Community created" }
  })
}

export async function deleteCommunity(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await adminContext()
    check(await supabase.from("communities").delete().eq("id", id))
    revalidatePath("/admin/communities")
    return { ok: true, message: "Community deleted" }
  })
}

export async function setCommunityModerator(communityId: string, profileId: string, moderator: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await adminContext()
    check(
      await supabase
        .from("community_members")
        .upsert({ community_id: communityId, profile_id: profileId, role: moderator ? "moderator" : "member" }, { onConflict: "community_id,profile_id" })
    )
    revalidatePath("/admin/communities")
    return { ok: true, message: moderator ? "Moderator added" : "Moderator removed" }
  })
}

const resourceSchema = z.object({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(10).max(400),
  body: z.string().max(30000).optional(),
  category: z.enum(RESOURCE_CATEGORY_KEYS as [string, ...string[]]),
  kind: z.enum(["guide", "template", "checklist", "tool", "story"]),
  external_url: z.string().trim().url().optional().or(z.literal("")),
  read_minutes: z.coerce.number().int().min(1).max(120).optional().nullable(),
  is_featured: z.boolean(),
  is_published: z.boolean(),
})

export async function saveResource(id: string | null, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = resourceSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid resource" }
    const { supabase, user } = await adminContext()
    const row = { ...parsed.data, category: parsed.data.category as never, external_url: parsed.data.external_url || null, body: parsed.data.body || null }
    if (id) check(await supabase.from("resources").update(row).eq("id", id))
    else check(await supabase.from("resources").insert({ ...row, slug: `${slugify(parsed.data.title)}-${Math.random().toString(36).slice(2, 6)}`, author_id: user.id }))
    revalidatePath("/admin/resources")
    revalidatePath("/resources")
    return { ok: true, message: "Resource saved" }
  })
}

export async function deleteResource(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await adminContext()
    check(await supabase.from("resources").delete().eq("id", id))
    revalidatePath("/admin/resources")
    return { ok: true, message: "Resource deleted" }
  })
}

export async function saveSettings(settings: { allow_signups: boolean; community_chat_enabled: boolean; announcement_banner: string }): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await adminContext()
    const now = new Date().toISOString()
    check(
      await supabase.from("platform_settings").upsert([
        { key: "allow_signups", value: settings.allow_signups, updated_by: user.id, updated_at: now },
        { key: "community_chat_enabled", value: settings.community_chat_enabled, updated_by: user.id, updated_at: now },
        { key: "announcement_banner", value: settings.announcement_banner.trim().slice(0, 280), updated_by: user.id, updated_at: now },
      ])
    )
    revalidatePath("/", "layout")
    return { ok: true, message: "Settings saved" }
  })
}
