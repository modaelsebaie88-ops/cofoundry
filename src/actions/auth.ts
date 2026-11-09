"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/auth"

async function siteUrl() {
  const h = await headers()
  const origin = h.get("origin")
  return origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

const safeNext = (next: unknown) => (typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard")

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[A-Za-z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
})

export async function signUp(_: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) }
  }
  const supabase = await createClient()
  const { data: setting } = await supabase.from("platform_settings").select("value").eq("key", "allow_signups").maybeSingle()
  if (setting?.value === false) return { ok: false, error: "New sign-ups are temporarily paused. Please check back soon." }
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding`,
    },
  })
  if (error) return { ok: false, error: error.message }
  // With email confirmation enabled no session is returned until the email is verified.
  if (data.session) redirect("/onboarding")
  return { ok: true, message: parsed.data.email }
}

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
})

export async function signIn(_: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      return { ok: false, error: "Please verify your email first — check your inbox for the confirmation link." }
    }
    return { ok: false, error: "Incorrect email or password." }
  }
  redirect(safeNext(formData.get("next")))
}

export async function resendConfirmation(email: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
  })
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in failed")}`)
  redirect(data.url)
}

export async function requestPasswordReset(_: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = z.object({ email: z.email("Enter a valid email address") }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." }
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password`,
  })
  // Always respond the same way so the form can't be used to discover accounts.
  if (error && !/rate limit/i.test(error.message)) console.error("reset password:", error.message)
  if (error && /rate limit/i.test(error.message)) return { ok: false, error: "Too many requests — please wait a minute." }
  return { ok: true }
}

export async function updatePassword(_: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ password: signUpSchema.shape.password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) }
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return { ok: false, error: "Your reset link has expired. Request a new one." }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    out[key] ??= issue.message
  }
  return out
}
