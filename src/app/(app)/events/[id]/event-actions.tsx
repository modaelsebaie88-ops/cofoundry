"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlus, CheckCircle2, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteEvent, registerForEvent } from "@/actions/events"
import { Button } from "@/components/ui/button"

type Ev = { id: string; title: string; description: string; starts_at: string; ends_at: string; location: string }

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}
function escapeIcs(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")
}

/** Generates an .ics file so attendees can add the event to any calendar. */
function downloadIcs(e: Ev) {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cofoundry//Events//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@cofoundry`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(e.starts_at)}`,
    `DTEND:${icsDate(e.ends_at)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    `DESCRIPTION:${escapeIcs(e.description.slice(0, 1000) + `\n\n${location.origin}/events/${e.id}`)}`,
    `LOCATION:${escapeIcs(e.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `${e.title.replace(/[^\w]+/g, "-").toLowerCase()}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

export function EventActions({ event, registered, isOrganizer, ended, full }: { event: Ev; registered: boolean; isOrganizer: boolean; ended: boolean; full: boolean }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const toggle = (register: boolean) =>
    start(async () => {
      const r = await registerForEvent(event.id, register)
      r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
    })

  return (
    <div className="space-y-2">
      {ended ? (
        <p className="text-center text-sm text-muted-foreground">This event has ended.</p>
      ) : registered ? (
        <>
          <p className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-4" /> You&apos;re registered
          </p>
          {!isOrganizer && (
            <Button variant="ghost" className="w-full" disabled={pending} onClick={() => toggle(false)}>
              Cancel registration
            </Button>
          )}
        </>
      ) : (
        <Button size="lg" className="w-full" disabled={pending || full} onClick={() => toggle(true)}>
          {pending && <Loader2 className="animate-spin" />} {full ? "Event is full" : "Register"}
        </Button>
      )}
      {!ended && (
        <Button variant="outline" className="w-full" onClick={() => downloadIcs(event)}>
          <CalendarPlus /> Add to calendar
        </Button>
      )}
      {isOrganizer && (
        <Button
          variant="destructive"
          className="w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (!confirm("Delete this event? Registrants will lose access.")) return
              const r = await deleteEvent(event.id)
              if (r.ok) {
                toast.success(r.message)
                router.push("/events")
              } else toast.error(r.error)
            })
          }
        >
          <Trash2 /> Delete event
        </Button>
      )}
    </div>
  )
}
