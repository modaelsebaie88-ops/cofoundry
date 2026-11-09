"use server"

import { revalidatePath } from "next/cache"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"
import { opportunitySchema, zodFieldErrors } from "@/lib/validation"

export async function saveOpportunity(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = opportunitySchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) }
    const { supabase, user } = await actionContext()
    const { attach_startup, ...d } = parsed.data
    const { data: startup } = await supabase.from("startups").select("id").eq("owner_id", user.id).maybeSingle()
    const row = {
      ...d,
      type: d.type as never,
      stage: (d.stage || null) as never,
      collaboration_type: d.collaboration_type as never,
      category_id: d.category_id || null,
      startup_id: attach_startup && startup ? startup.id : null,
    }
    if (id) {
      const { data, error } = await supabase.from("opportunities").update(row).eq("id", id).eq("author_id", user.id).select("id").single()
      if (error) throw new Error(error.message)
      revalidatePath("/opportunities", "layout")
      return { ok: true, data: { id: data.id } }
    }
    const { data, error } = await supabase.from("opportunities").insert({ ...row, author_id: user.id }).select("id").single()
    if (error) throw new Error(error.message)
    revalidatePath("/opportunities", "layout")
    return { ok: true, data: { id: data.id } }
  })
}

export async function setOpportunityStatus(id: string, status: "open" | "closed"): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("opportunities").update({ status }).eq("id", id).select("id")
    if (!data?.length) return { ok: false, error: "You can't change this opportunity." }
    revalidatePath("/opportunities", "layout")
    return { ok: true, message: status === "closed" ? "Opportunity closed" : "Opportunity reopened" }
  })
}

export async function deleteOpportunity(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("opportunities").delete().eq("id", id).select("id")
    if (!data?.length) return { ok: false, error: "You can't delete this opportunity." }
    revalidatePath("/opportunities", "layout")
    return { ok: true, message: "Opportunity deleted" }
  })
}

export async function applyToOpportunity(opportunityId: string, message: string): Promise<ActionResult> {
  return runAction(async () => {
    const text = message.trim()
    if (text.length < 10) return { ok: false, error: "Tell them a bit more about why you're a fit (10+ characters)." }
    const { supabase, user } = await actionContext()
    const { error } = await supabase.from("opportunity_applications").insert({ opportunity_id: opportunityId, applicant_id: user.id, message: text.slice(0, 3000) })
    if (error) {
      if (/duplicate/.test(error.message)) return { ok: false, error: "You've already applied." }
      return { ok: false, error: error.message }
    }
    revalidatePath(`/opportunities/${opportunityId}`)
    return { ok: true, message: "Application sent — the founder has been notified." }
  })
}

export async function withdrawApplication(applicationId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("opportunity_applications").update({ status: "withdrawn" }).eq("id", applicationId))
    revalidatePath("/opportunities", "layout")
    return { ok: true, message: "Application withdrawn" }
  })
}

export async function respondToApplication(applicationId: string, accept: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { error } = await supabase.from("opportunity_applications").update({ status: accept ? "accepted" : "declined" }).eq("id", applicationId)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/opportunities", "layout")
    return { ok: true, message: accept ? "Applicant accepted — they've been notified" : "Application declined" }
  })
}
