"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Lock, LockOpen, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteOpportunity, setOpportunityStatus } from "@/actions/opportunities"
import { Button } from "@/components/ui/button"

export function OwnerActions({ id, status }: { id: string; status: "open" | "closed" }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setOpportunityStatus(id, status === "open" ? "closed" : "open")
            r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
          })
        }
      >
        {status === "open" ? <Lock /> : <LockOpen />} {status === "open" ? "Close" : "Reopen"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!confirm("Delete this opportunity and all applications?")) return
            const r = await deleteOpportunity(id)
            if (r.ok) {
              toast.success(r.message)
              router.push("/opportunities/mine")
            } else toast.error(r.error)
          })
        }
      >
        <Trash2 /> Delete
      </Button>
    </>
  )
}
