"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"
import { zodFieldErrors } from "@/lib/validation"
import { STAGE_KEYS } from "@/lib/constants"

const mentorSchema = z.object({
  expertise: z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one area of expertise").max(15),
  focus_stages: z.array(z.enum(STAGE_KEYS as [string, ...string[]])).default([]),
  about: z.string().trim().min(20, "Write at least 20 characters").max(3000),
  availability_note: z.string().trim().max(300).optional().nullable(),
  session_minutes: z.coerce.number().int().min(15).max(180),
  sessions_per_month: z.coerce.number().int().min(1).max(60),
  is_accepting: z.boolean(),
})

export async function saveMentorProfile(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = mentorSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) }
    const { supabase, user } = await actionContext()
    const row = { ...parsed.data, focus_stages: parsed.data.focus_stages as never, profile_id: user.id }
    const { data: existing } = await supabase.from("mentor_profiles").select("profile_id").eq("profile_id", user.id).maybeSingle()
    if (existing) check(await supabase.from("mentor_profiles").update(row).eq("profile_id", user.id))
    else check(await supabase.from("mentor_profiles").insert(row))
    revalidatePath("/mentorship", "layout")
    return { ok: true, message: existing ? "Mentor profile updated" : "You're now a mentor on Cofoundry 🎉" }
  })
}

const requestSchema = z.object({
  mentor_id: z.string().uuid(),
  topic: z.string().trim().min(3, "Add a topic").max(140),
  message: z.string().trim().min(10, "Give the mentor some context (10+ characters)").max(3000),
  preferred_times: z.array(z.string()).max(3).default([]),
})

export async function requestSession(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = requestSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request", fieldErrors: zodFieldErrors(parsed.error) }
    const times = parsed.data.preferred_times.filter(Boolean).map((t) => new Date(t))
    if (times.some((t) => isNaN(+t) || t < new Date())) return { ok: false, error: "Preferred times must be in the future." }
    const { supabase, user } = await actionContext()
    if (parsed.data.mentor_id === user.id) return { ok: false, error: "You can't book yourself." }
    const { error } = await supabase.from("mentorship_requests").insert({
      ...parsed.data,
      mentee_id: user.id,
      preferred_times: times.map((t) => t.toISOString()),
    })
    if (error) return { ok: false, error: error.message }
    revalidatePath("/mentorship", "layout")
    return { ok: true, message: "Request sent — the mentor has been notified." }
  })
}

export async function respondToRequest(
  id: string,
  input: { status: "accepted" | "declined" | "completed" | "cancelled"; scheduled_at?: string; meeting_url?: string; mentor_note?: string }
): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const patch: { status: typeof input.status; scheduled_at?: string; meeting_url?: string | null; mentor_note?: string | null } = { status: input.status }
    if (input.status === "accepted") {
      if (!input.scheduled_at) return { ok: false, error: "Pick a session time." }
      const t = new Date(input.scheduled_at)
      if (isNaN(+t) || t < new Date()) return { ok: false, error: "Pick a time in the future." }
      patch.scheduled_at = t.toISOString()
      const url = input.meeting_url?.trim()
      if (url && !/^https?:\/\//i.test(url)) return { ok: false, error: "Meeting link must start with https://" }
      patch.meeting_url = url || null
    }
    if (input.mentor_note !== undefined) patch.mentor_note = input.mentor_note.trim().slice(0, 1000) || null
    const { error } = await supabase.from("mentorship_requests").update(patch).eq("id", id)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/mentorship", "layout")
    return { ok: true, message: `Session ${input.status}` }
  })
}

export async function reviewMentor(requestId: string, mentorId: string, rating: number, comment: string): Promise<ActionResult> {
  return runAction(async () => {
    if (rating < 1 || rating > 5) return { ok: false, error: "Pick a rating from 1 to 5." }
    const { supabase, user } = await actionContext()
    const { error } = await supabase
      .from("mentorship_reviews")
      .insert({ request_id: requestId, mentor_id: mentorId, reviewer_id: user.id, rating, comment: comment.trim().slice(0, 2000) || null })
    if (error) return { ok: false, error: /duplicate/.test(error.message) ? "You've already reviewed this session." : error.message }
    revalidatePath("/mentorship", "layout")
    return { ok: true, message: "Thanks for your feedback!" }
  })
}
