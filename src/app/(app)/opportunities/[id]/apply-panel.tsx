"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock, Loader2, Send, XCircle } from "lucide-react"
import { toast } from "sonner"
import { applyToOpportunity, withdrawApplication } from "@/actions/opportunities"
import { Panel } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type App = { id: string; status: string; message: string; created_at: string } | null

export function ApplyPanel({ opportunityId, open, application }: { opportunityId: string; open: boolean; application: App }) {
  const [message, setMessage] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()

  if (application) {
    const meta = {
      pending: { icon: Clock, text: "Your application is under review.", cls: "text-amber-700 bg-amber-50 border-amber-200" },
      accepted: { icon: CheckCircle2, text: "Your application was accepted! Reach out to the founder to take the next step.", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
      declined: { icon: XCircle, text: "The founder decided not to move forward this time.", cls: "text-muted-foreground bg-muted border-border" },
      withdrawn: { icon: XCircle, text: "You withdrew this application. Message the founder directly if you'd like to reconnect.", cls: "text-muted-foreground bg-muted border-border" },
    }[application.status as "pending" | "accepted" | "declined" | "withdrawn"]
    return (
      <Panel className="p-6">
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${meta.cls}`}>
          <meta.icon className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{meta.text}</p>
            <p className="mt-2 text-sm whitespace-pre-line text-foreground/80">&ldquo;{application.message}&rdquo;</p>
          </div>
        </div>
        {application.status === "pending" && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await withdrawApplication(application.id)
                r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
              })
            }
          >
            Withdraw application
          </Button>
        )}
      </Panel>
    )
  }

  if (!open) {
    return <Panel className="p-6 text-center text-sm text-muted-foreground">This opportunity is closed and no longer accepting applications.</Panel>
  }

  return (
    <Panel className="p-6">
      <h2 className="font-semibold">Express interest</h2>
      <p className="mt-1 text-sm text-muted-foreground">Introduce yourself and explain why you&apos;re a great fit. The founder will see your profile alongside your message.</p>
      <Textarea
        rows={5}
        maxLength={3000}
        className="mt-4"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Relevant experience, what excites you about this, and your availability…"
        aria-label="Application message"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{message.length}/3000</span>
        <Button
          disabled={pending || message.trim().length < 10}
          onClick={() =>
            start(async () => {
              const r = await applyToOpportunity(opportunityId, message)
              if (r.ok) {
                toast.success(r.message)
                router.refresh()
              } else toast.error(r.error)
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <Send />} Send application
        </Button>
      </div>
    </Panel>
  )
}
