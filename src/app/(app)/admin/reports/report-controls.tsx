"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { resolveReport } from "@/actions/moderation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ReportControls({ id, canRemove }: { id: string; canRemove: boolean }) {
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  const run = (status: "resolved" | "dismissed", remove = false) =>
    start(async () => {
      if (remove && !confirm("Permanently remove the reported content?")) return
      const r = await resolveReport(id, status, note, remove)
      r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
    })
  return (
    <div className="mt-4 flex flex-col gap-2 border-t pt-4 lg:flex-row">
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resolution note (shared with the reporter)" maxLength={1000} />
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={pending} onClick={() => run("dismissed")}>
          Dismiss
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => run("resolved")}>
          Resolve
        </Button>
        {canRemove && (
          <Button variant="destructive" disabled={pending} onClick={() => run("resolved", true)}>
            Remove content & resolve
          </Button>
        )}
      </div>
    </div>
  )
}
