import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/database.types"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

/** Verified current user (validated against Supabase Auth). Cached per request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
})

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  return data
})

/** For pages: ensures a signed-in, onboarded, active user. */
export async function requireProfile(opts: { allowIncomplete?: boolean } = {}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.is_suspended) redirect("/suspended")
  if (!opts.allowIncomplete && !profile.onboarding_completed) redirect("/onboarding")
  return profile
}

export async function requireAdmin() {
  const profile = await requireProfile()
  if (profile.role !== "admin") redirect("/dashboard")
  return profile
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export class ActionError extends Error {}

/** For server actions: returns an authenticated Supabase client + user, or throws. */
export async function actionContext() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new ActionError("You need to be signed in.")
  return { supabase, user: data.user }
}

/** Wraps a server action body, converting thrown errors into ActionResult failures. */
export async function runAction<T = undefined>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn()
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e
    const message = e instanceof Error ? e.message : "Something went wrong"
    return { ok: false, error: friendlyDbError(message) }
  }
}

export function friendlyDbError(message: string) {
  if (/duplicate key value/.test(message)) return "That already exists."
  if (/row-level security/.test(message)) return "You don't have permission to do that."
  if (/violates check constraint/.test(message)) return "Some of the values are invalid. Please check the form."
  if (/violates foreign key/.test(message)) return "A referenced item no longer exists."
  return message
}

/** Throws if a Supabase response has an error. */
export function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new ActionError(res.error.message)
  return res.data
}
