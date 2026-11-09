"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"

const reportSchema = z.object({
  target_type: z.enum(["post", "comment", "community_message", "message", "profile", "opportunity", "event"]),
  target_id: z.string().uuid(),
  community_id: z.string().uuid().nullable().optional(),
  reason: z.enum(["spam", "harassment", "inappropriate", "misinformation", "scam", "other"]),
  details: z.string().trim().max(1000).optional().nullable(),
  snapshot: z.string().max(2000).optional().nullable(),
})

export async function fileReport(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = reportSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Please choose a reason." }
    const { supabase, user } = await actionContext()
    const { error } = await supabase.from("reports").insert({ ...parsed.data, reporter_id: user.id, details: parsed.data.details || null })
    if (error) {
      if (/duplicate/.test(error.message)) return { ok: false, error: "You've already reported this. Our moderators are on it." }
      throw new Error(error.message)
    }
    return { ok: true, message: "Thanks — a moderator will review this." }
  })
}

export async function resolveReport(id: string, status: "resolved" | "dismissed", note?: string, removeContent?: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data: report } = await supabase.from("reports").select("*").eq("id", id).single()
    if (!report) return { ok: false, error: "Report not found or you don't have access." }
    if (removeContent) {
      const table = {
        post: "community_posts",
        comment: "comments",
        community_message: "community_messages",
        opportunity: "opportunities",
        event: "events",
      }[report.target_type as string] as "community_posts" | "comments" | "community_messages" | "opportunities" | "events" | undefined
      if (table) {
        // RLS enforces that only moderators of that community / admins can delete.
        const { error } = await supabase.from(table).delete().eq("id", report.target_id)
        if (error) return { ok: false, error: "You don't have permission to remove this content." }
      }
    }
    check(await supabase.from("reports").update({ status, resolution_note: note?.trim() || null }).eq("id", id))
    revalidatePath("/admin/reports")
    return { ok: true, message: status === "resolved" ? "Report resolved" : "Report dismissed" }
  })
}

export async function requestVerification(input: { target_type: "profile" | "startup"; evidence: string; links: string[] }): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    const evidence = input.evidence.trim()
    if (evidence.length < 20) return { ok: false, error: "Describe your evidence in at least 20 characters." }
    const links = input.links.map((l) => l.trim()).filter(Boolean).slice(0, 5)
    if (links.some((l) => !/^https?:\/\//i.test(l))) return { ok: false, error: "Links must start with http:// or https://" }
    let startup_id: string | null = null
    if (input.target_type === "startup") {
      const { data } = await supabase.from("startups").select("id").eq("owner_id", user.id).maybeSingle()
      if (!data) return { ok: false, error: "Create your startup profile first." }
      startup_id = data.id
    }
    const { error } = await supabase
      .from("verification_requests")
      .insert({ requester_id: user.id, target_type: input.target_type, startup_id, evidence, links })
    if (error) {
      if (/duplicate|unique/.test(error.message)) return { ok: false, error: "You already have a pending request for this." }
      throw new Error(error.message)
    }
    revalidatePath("/settings/verification")
    return { ok: true, message: "Verification request submitted" }
  })
}
