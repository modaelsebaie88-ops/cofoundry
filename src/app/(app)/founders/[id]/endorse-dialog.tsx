"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ThumbsUp } from "lucide-react"
import { toast } from "sonner"
import { endorseFounder } from "@/actions/network"
import { Field } from "@/components/shared/form"
import { NativeSelect } from "@/components/shared/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function EndorseDialog({ endorseeId, endorseeName, skills }: { endorseeId: string; endorseeName: string; skills: string[] }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [skill, setSkill] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <>
      <Button size="xs" variant="outline" onClick={() => setOpen(true)}>
        <ThumbsUp /> Recommend
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recommend {endorseeName}</DialogTitle>
            <DialogDescription>Share a genuine experience of working with them. Your recommendation is public.</DialogDescription>
          </DialogHeader>
          {skills.length > 0 && (
            <Field label="Skill (optional)">
              <NativeSelect value={skill} onChange={(e) => setSkill(e.target.value)}>
                <option value="">General recommendation</option>
                {skills.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field label="Recommendation">
            <Textarea rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you work on together and what stood out?" />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || body.trim().length < 10}
              onClick={() =>
                start(async () => {
                  const r = await endorseFounder(endorseeId, body, skill)
                  if (r.ok) {
                    toast.success(r.message)
                    setOpen(false)
                    router.refresh()
                  } else toast.error(r.error)
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
