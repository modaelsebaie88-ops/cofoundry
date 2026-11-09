"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { removeConnection, respondToConnection } from "@/actions/network"
import { Button } from "@/components/ui/button"

export function ConnectionActions({ id, mode }: { id: string; mode: "connections" | "requests" | "sent" }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, confirmText?: string) =>
    start(async () => {
      if (confirmText && !confirm(confirmText)) return
      const r = await fn()
      if (r.ok) {
        if (r.message) toast.success(r.message)
        router.refresh()
      } else toast.error(r.error)
    })
  if (mode === "requests") {
    return (
      <>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => respondToConnection(id, false))}>
          <X /> Ignore
        </Button>
        <Button size="sm" disabled={pending} onClick={() => run(() => respondToConnection(id, true))}>
          <Check /> Accept
        </Button>
      </>
    )
  }
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => removeConnection(id), mode === "sent" ? "Withdraw this request?" : "Remove this connection?")}>
      {mode === "sent" ? "Withdraw" : "Remove"}
    </Button>
  )
}
