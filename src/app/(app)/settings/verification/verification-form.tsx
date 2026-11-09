"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { requestVerification } from "@/actions/moderation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function VerificationForm({ targetType }: { targetType: "profile" | "startup" }) {
  const [open, setOpen] = useState(false)
  const [evidence, setEvidence] = useState("")
  const [links, setLinks] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  if (!open)
    return (
      <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpen(true)}>
        Request verification
      </Button>
    )
  return (
    <div className="mt-3 space-y-2">
      <Textarea rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={3000} placeholder="Describe your evidence (role, company registration, domain email…)" />
      <Input value={links} onChange={(e) => setLinks(e.target.value)} placeholder="Supporting links, comma-separated (https://…)" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={pending || evidence.trim().length < 20}
          onClick={() =>
            start(async () => {
              const r = await requestVerification({ target_type: targetType, evidence, links: links.split(",").map((l) => l.trim()).filter(Boolean) })
              if (r.ok) {
                toast.success(r.message)
                router.refresh()
              } else toast.error(r.error)
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Submit
        </Button>
      </div>
    </div>
  )
}
