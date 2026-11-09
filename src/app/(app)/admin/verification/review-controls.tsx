"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { reviewVerification } from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ReviewControls({ id }: { id: string }) {
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  const run = (approve: boolean) =>
    start(async () => {
      const r = await reviewVerification(id, approve, note)
      r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
    })
  return (
    <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row">
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Review note (shared with the founder)" maxLength={1000} />
      <div className="flex gap-2">
        <Button variant="outline" disabled={pending} onClick={() => run(false)}>
          <X /> Reject
        </Button>
        <Button disabled={pending} onClick={() => run(true)}>
          <Check /> Approve
        </Button>
      </div>
    </div>
  )
}
