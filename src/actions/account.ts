"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { actionContext, runAction, type ActionResult } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  return runAction(async () => {
    const pw = z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/).safeParse(newPassword)
    if (!pw.success) return { ok: false, error: "Use at least 8 characters with letters and numbers." }
    const { supabase, user } = await actionContext()
    // Re-authenticate before changing credentials.
    const { error: reauth } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword })
    if (reauth) return { ok: false, error: "Your current password is incorrect." }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: error.message }
    return { ok: true, message: "Password updated" }
  })
}

export async function changeEmail(email: string): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = z.email().safeParse(email.trim())
    if (!parsed.success) return { ok: false, error: "Enter a valid email address." }
    const { supabase } = await actionContext()
    const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL
    const { error } = await supabase.auth.updateUser({ email: parsed.data }, { emailRedirectTo: `${origin}/auth/callback?next=/settings/account` })
    if (error) return { ok: false, error: error.message }
    return { ok: true, message: "Check both inboxes to confirm the change." }
  })
}

export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const result = await runAction(async () => {
    if (confirmation !== "DELETE") return { ok: false, error: 'Type "DELETE" to confirm.' }
    const { supabase, user } = await actionContext()
    // The user is authenticated above; only their own account is removed.
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return { ok: false, error: error.message }
    await supabase.auth.signOut()
    return { ok: true }
  })
  if (result.ok) redirect("/?deleted=1")
  return result
}
