"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { setAttendance } from "@/actions/events"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Checkbox } from "@/components/ui/checkbox"

type Attendee = { id: string; full_name: string; avatar_url: string | null; headline: string | null; attended: boolean }

export function AttendanceList({ eventId, attendees, ended }: { eventId: string; attendees: Attendee[]; ended: boolean }) {
  const [state, setState] = useState(() => Object.fromEntries(attendees.map((a) => [a.id, a.attended])))
  const [, start] = useTransition()
  const count = Object.values(state).filter(Boolean).length
  return (
    <Panel className="p-6">
      <SectionTitle action={<span className="text-xs text-muted-foreground">{count} attended</span>}>Attendance tracking (organizer only)</SectionTitle>
      {!ended && <p className="mb-3 text-xs text-muted-foreground">Mark attendance during or after the event. Attendance counts towards founders&apos; reputation.</p>}
      <ul className="divide-y rounded-xl border">
        {attendees.map((a) => (
          <li key={a.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
              <Checkbox
                checked={state[a.id]}
                onCheckedChange={(v) => {
                  const next = Boolean(v)
                  setState((s) => ({ ...s, [a.id]: next }))
                  start(async () => {
                    const r = await setAttendance(eventId, a.id, next)
                    if (!r.ok) {
                      setState((s) => ({ ...s, [a.id]: !next }))
                      toast.error(r.error)
                    }
                  })
                }}
              />
              <UserAvatar name={a.full_name} src={a.avatar_url} size="xs" />
              <span className="min-w-0 flex-1 truncate text-sm">{a.full_name}</span>
            </label>
          </li>
        ))}
        {!attendees.length && <li className="p-4 text-center text-sm text-muted-foreground">No registrations yet.</li>}
      </ul>
    </Panel>
  )
}
