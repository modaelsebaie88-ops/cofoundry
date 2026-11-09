"use server"

import { revalidatePath } from "next/cache"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    check(
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("profile_id", user.id)
    )
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("type", "message")
      .eq("link", `/messages/${conversationId}`)
    return { ok: true }
  })
}

export async function createGroup(title: string, memberIds: string[]): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data, error } = await supabase.rpc("create_group_conversation", { group_title: title, member_ids: memberIds })
    if (error) return { ok: false, error: error.message }
    revalidatePath("/messages", "layout")
    return { ok: true, data: { id: data as string } }
  })
}

export async function renameGroup(conversationId: string, title: string): Promise<ActionResult> {
  return runAction(async () => {
    const t = title.trim()
    if (!t || t.length > 100) return { ok: false, error: "Use 1–100 characters." }
    const { supabase } = await actionContext()
    check(await supabase.from("conversations").update({ title: t }).eq("id", conversationId))
    revalidatePath("/messages", "layout")
    return { ok: true }
  })
}

export async function leaveGroup(conversationId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    check(await supabase.from("conversation_participants").delete().eq("conversation_id", conversationId).eq("profile_id", user.id))
    revalidatePath("/messages", "layout")
    return { ok: true }
  })
}
