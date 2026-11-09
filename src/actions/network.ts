"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"
import { refreshRecommendations } from "@/lib/matching/service"

export async function sendConnectionRequest(targetId: string, message?: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    if (targetId === user.id) return { ok: false, error: "You can't connect with yourself." }
    const msg = message?.trim().slice(0, 500) || null
    const { data: existing } = await supabase
      .from("connections")
      .select("id, status, requester_id")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`)
      .maybeSingle()
    if (existing) {
      if (existing.status === "accepted") return { ok: false, error: "You're already connected." }
      if (existing.status === "pending" && existing.requester_id === targetId) {
        // They already asked us — accept instead of creating a duplicate.
        check(await supabase.from("connections").update({ status: "accepted" }).eq("id", existing.id))
        revalidatePath("/", "layout")
        return { ok: true, message: "Connected!" }
      }
      if (existing.status === "pending") return { ok: false, error: "Request already sent." }
      // A declined request can be re-sent by deleting the old row first (either party may delete).
      check(await supabase.from("connections").delete().eq("id", existing.id))
    }
    check(await supabase.from("connections").insert({ requester_id: user.id, addressee_id: targetId, message: msg }))
    revalidatePath("/", "layout")
    return { ok: true, message: "Connection request sent" }
  })
}

export async function respondToConnection(connectionId: string, accept: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("connections").update({ status: accept ? "accepted" : "declined" }).eq("id", connectionId))
    revalidatePath("/", "layout")
    return { ok: true, message: accept ? "Connected!" : "Request declined" }
  })
}

export async function removeConnection(connectionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("connections").delete().eq("id", connectionId))
    revalidatePath("/", "layout")
    return { ok: true }
  })
}

const savedType = z.enum(["founder", "opportunity", "resource", "event", "startup", "post"])

export async function toggleSaved(itemType: string, itemId: string, save: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const type = savedType.parse(itemType)
    const { supabase, user } = await actionContext()
    if (save) {
      check(await supabase.from("saved_items").upsert({ profile_id: user.id, item_type: type, item_id: itemId }, { ignoreDuplicates: true }))
    } else {
      check(await supabase.from("saved_items").delete().eq("profile_id", user.id).eq("item_type", type).eq("item_id", itemId))
    }
    revalidatePath("/saved")
    revalidatePath("/dashboard")
    return { ok: true, message: save ? "Saved" : "Removed from saved" }
  })
}

export async function dismissRecommendation(targetId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    check(await supabase.from("recommendations").update({ status: "dismissed" }).eq("profile_id", user.id).eq("target_id", targetId))
    revalidatePath("/dashboard")
    revalidatePath("/discover")
    return { ok: true }
  })
}

export async function restoreDismissed(): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    check(await supabase.from("recommendations").update({ status: "active" }).eq("profile_id", user.id).eq("status", "dismissed"))
    revalidatePath("/discover")
    return { ok: true }
  })
}

export async function recomputeRecommendations(): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    await refreshRecommendations(supabase, user.id, { force: true })
    revalidatePath("/discover")
    revalidatePath("/dashboard")
    return { ok: true, message: "Recommendations updated" }
  })
}

export async function endorseFounder(endorseeId: string, body: string, skill?: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    const text = body.trim()
    if (text.length < 10) return { ok: false, error: "Write at least a sentence (10+ characters)." }
    const { error } = await supabase
      .from("endorsements")
      .insert({ endorser_id: user.id, endorsee_id: endorseeId, body: text.slice(0, 1000), skill: skill?.trim().slice(0, 60) || null })
    if (error) {
      if (/duplicate/.test(error.message)) return { ok: false, error: "You've already written a recommendation for this founder." }
      if (/row-level/.test(error.message)) return { ok: false, error: "You can only recommend founders you're connected with." }
      throw new Error(error.message)
    }
    revalidatePath(`/founders/${endorseeId}`)
    return { ok: true, message: "Recommendation published" }
  })
}

export async function startConversation(otherId: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data, error } = await supabase.rpc("get_or_create_dm", { other_id: otherId })
    if (error) throw new Error(error.message)
    return { ok: true, data: { id: data as string } }
  })
}
