"use client"

import { useState, useTransition } from "react"
import { Bookmark } from "lucide-react"
import { toast } from "sonner"
import { toggleSaved } from "@/actions/network"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SaveButton({
  itemType,
  itemId,
  saved,
  withLabel = false,
  size,
  className,
}: {
  itemType: "founder" | "opportunity" | "resource" | "event" | "startup" | "post"
  itemId: string
  saved: boolean
  withLabel?: boolean
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}) {
  const [isSaved, setSaved] = useState(saved)
  const [pending, start] = useTransition()
  return (
    <Button
      type="button"
      variant={withLabel ? "outline" : "ghost"}
      size={size ?? (withLabel ? "sm" : "icon-sm")}
      className={className}
      disabled={pending}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove from saved" : "Save"}
      onClick={() =>
        start(async () => {
          const next = !isSaved
          setSaved(next)
          const r = await toggleSaved(itemType, itemId, next)
          if (!r.ok) {
            setSaved(!next)
            toast.error(r.error)
          } else toast.success(next ? "Saved" : "Removed from saved")
        })
      }
    >
      <Bookmark className={cn(isSaved && "fill-primary text-primary")} />
      {withLabel && (isSaved ? "Saved" : "Save")}
    </Button>
  )
}
