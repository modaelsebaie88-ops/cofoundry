"use client"

import { useState, useTransition } from "react"
import { Flag, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { fileReport } from "@/actions/moderation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { REPORT_REASONS } from "@/lib/constants"

type TargetType = "post" | "comment" | "community_message" | "message" | "profile" | "opportunity" | "event"

export function ReportDialog({
  targetType,
  targetId,
  communityId,
  snapshot,
  open,
  onOpenChange,
}: {
  targetType: TargetType
  targetId: string
  communityId?: string | null
  snapshot?: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [reason, setReason] = useState<keyof typeof REPORT_REASONS | "">("")
  const [details, setDetails] = useState("")
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {targetType.replace("_", " ")}</DialogTitle>
          <DialogDescription>Reports are confidential and reviewed by moderators.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={(v) => setReason(v as keyof typeof REPORT_REASONS)} className="gap-2">
          {Object.entries(REPORT_REASONS).map(([k, label]) => (
            <Label key={k} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal has-[[data-checked]]:border-primary has-[[data-checked]]:bg-accent">
              <RadioGroupItem value={k} /> {label}
            </Label>
          ))}
        </RadioGroup>
        <Textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything else moderators should know? (optional)" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason || pending}
            onClick={() =>
              start(async () => {
                const r = await fileReport({ target_type: targetType, target_id: targetId, community_id: communityId ?? null, reason, details, snapshot: snapshot?.slice(0, 2000) })
                if (r.ok) {
                  toast.success(r.message)
                  onOpenChange(false)
                  setReason("")
                  setDetails("")
                } else toast.error(r.error)
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReportButton(props: Omit<React.ComponentProps<typeof ReportDialog>, "open" | "onOpenChange"> & { label?: boolean }) {
  const [open, setOpen] = useState(false)
  const { label, ...rest } = props
  return (
    <>
      <Button variant="ghost" size={label ? "sm" : "icon-sm"} onClick={() => setOpen(true)} aria-label="Report" className="text-muted-foreground">
        <Flag /> {label && "Report"}
      </Button>
      <ReportDialog {...rest} open={open} onOpenChange={setOpen} />
    </>
  )
}
