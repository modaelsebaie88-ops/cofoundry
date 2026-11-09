"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"
import { zodFieldErrors } from "@/lib/validation"

const schema = z.object({
  title: z.string().trim().min(5, "Use at least 5 characters").max(140),
  offer_skills: z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one skill you offer").max(10),
  want_skills: z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one skill you want").max(10),
  description: z.string().trim().max(2000).optional().nullable(),
  format: z.enum(["async", "calls", "pairing", "any"]),
})

export async function createExchange(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = schema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) }
    const { supabase, user } = await actionContext()
    check(await supabase.from("skill_exchanges").insert({ ...parsed.data, description: parsed.data.description || null, author_id: user.id }))
    revalidatePath("/skill-exchange")
    return { ok: true, message: "Exchange listing published" }
  })
}

export async function setExchangeStatus(id: string, status: "open" | "closed"): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("skill_exchanges").update({ status }).eq("id", id))
    revalidatePath("/skill-exchange")
    return { ok: true, message: status === "closed" ? "Listing closed" : "Listing reopened" }
  })
}

export async function deleteExchange(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("skill_exchanges").delete().eq("id", id))
    revalidatePath("/skill-exchange")
    return { ok: true, message: "Listing deleted" }
  })
}

/** Opens a DM with the listing author and sends the proposal as the first message. */
export async function proposeExchange(exchangeId: string, note: string): Promise<ActionResult<{ conversationId: string }>> {
  return runAction(async () => {
    const text = note.trim()
    if (text.length < 10) return { ok: false, error: "Add a short note (10+ characters)." }
    const { supabase, user } = await actionContext()
    const { data: ex } = await supabase.from("skill_exchanges").select("id, title, author_id, status").eq("id", exchangeId).single()
    if (!ex || ex.status !== "open") return { ok: false, error: "This listing is no longer open." }
    if (ex.author_id === user.id) return { ok: false, error: "This is your own listing." }
    const { data: cid, error } = await supabase.rpc("get_or_create_dm", { other_id: ex.author_id })
    if (error) throw new Error(error.message)
    check(
      await supabase.from("messages").insert({
        conversation_id: cid as string,
        sender_id: user.id,
        body: `🔁 Skill exchange proposal — re: "${ex.title}"\n\n${text.slice(0, 4000)}`,
      })
    )
    return { ok: true, data: { conversationId: cid as string } }
  })
}
