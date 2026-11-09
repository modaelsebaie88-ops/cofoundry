"use server"

import { revalidatePath } from "next/cache"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    let q = supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false)
    if (ids?.length) q = q.in("id", ids)
    check(await q)
    revalidatePath("/", "layout")
    return { ok: true as const }
  })
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("notifications").delete().eq("id", id))
    revalidatePath("/notifications")
    return { ok: true as const }
  })
}

export async function clearReadNotifications(): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    check(await supabase.from("notifications").delete().eq("recipient_id", user.id).eq("is_read", true))
    revalidatePath("/notifications")
    return { ok: true as const }
  })
}
