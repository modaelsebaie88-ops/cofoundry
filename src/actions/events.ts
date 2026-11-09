"use server"

import { revalidatePath } from "next/cache"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"
import { eventSchema, zodFieldErrors } from "@/lib/validation"

export async function saveEvent(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = eventSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) }
    const { supabase, user } = await actionContext()
    const d = parsed.data
    const row = {
      ...d,
      type: d.type as never,
      starts_at: new Date(d.starts_at).toISOString(),
      ends_at: new Date(d.ends_at).toISOString(),
      location: d.is_online ? d.location : d.location,
      community_id: d.community_id || null,
    }
    if (id) {
      const { data, error } = await supabase.from("events").update(row).eq("id", id).select("id").single()
      if (error) throw new Error(error.message)
      revalidatePath("/events", "layout")
      return { ok: true, data: { id: data.id } }
    }
    const { data, error } = await supabase.from("events").insert({ ...row, organizer_id: user.id }).select("id").single()
    if (error) {
      if (/row-level/.test(error.message)) return { ok: false, error: "You can only host events in communities you've joined." }
      throw new Error(error.message)
    }
    // Organizers are registered automatically.
    await supabase.from("event_registrations").insert({ event_id: data.id, profile_id: user.id })
    revalidatePath("/events", "layout")
    return { ok: true, data: { id: data.id } }
  })
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("events").delete().eq("id", id).select("id")
    if (!data?.length) return { ok: false, error: "You can't delete this event." }
    revalidatePath("/events", "layout")
    return { ok: true, message: "Event deleted" }
  })
}

export async function registerForEvent(eventId: string, register: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    const { data: existing } = await supabase.from("event_registrations").select("status").eq("event_id", eventId).eq("profile_id", user.id).maybeSingle()
    let error
    if (existing) {
      ;({ error } = await supabase
        .from("event_registrations")
        .update({ status: register ? "registered" : "cancelled" })
        .eq("event_id", eventId)
        .eq("profile_id", user.id))
    } else if (register) {
      ;({ error } = await supabase.from("event_registrations").insert({ event_id: eventId, profile_id: user.id }))
    }
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/events/${eventId}`)
    revalidatePath("/events")
    return { ok: true, message: register ? "You're registered! We'll remind you 24 hours before." : "Registration cancelled" }
  })
}

export async function setAttendance(eventId: string, profileId: string, attended: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("event_registrations").update({ attended }).eq("event_id", eventId).eq("profile_id", profileId))
    revalidatePath(`/events/${eventId}`)
    return { ok: true }
  })
}
