"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { recomputeRecommendations, restoreDismissed } from "@/actions/network"
import { Button } from "@/components/ui/button"

export function RecommendationControls() {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await restoreDismissed()
            if (r.ok) {
              toast.success("Dismissed recommendations restored")
              router.refresh()
            } else toast.error(r.error)
          })
        }
      >
        <RotateCcw /> Restore dismissed
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await recomputeRecommendations()
            if (r.ok) {
              toast.success("Recommendations recalculated")
              router.refresh()
            } else toast.error(r.error)
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Recalculate
      </Button>
    </>
  )
}
