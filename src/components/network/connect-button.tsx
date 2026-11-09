"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Clock, Loader2, MessageSquare, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { respondToConnection, sendConnectionRequest, startConversation } from "@/actions/network"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { ConnectionState } from "@/lib/queries/network"

type Size = React.ComponentProps<typeof Button>["size"]

export function ConnectButton({
  targetId,
  targetName,
  state,
  size = "sm",
  className,
  showMessage = false,
}: {
  targetId: string
  targetName: string
  state: ConnectionState
  size?: Size
  className?: string
  showMessage?: boolean
}) {
  const [current, setCurrent] = useState(state)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()

  const send = () =>
    start(async () => {
      const r = await sendConnectionRequest(targetId, note)
      if (r.ok) {
        toast.success(r.message ?? "Request sent")
        setCurrent(r.message === "Connected!" ? { status: "connected", id: "" } : { status: "outgoing", id: "" })
        setOpen(false)
        router.refresh()
      } else toast.error(r.error)
    })

  const message = () =>
    start(async () => {
      const r = await startConversation(targetId)
      if (r.ok && r.data) router.push(`/messages/${r.data.id}`)
      else if (!r.ok) toast.error(r.error)
    })

  if (current.status === "connected") {
    return showMessage ? (
      <Button size={size} variant="outline" className={className} onClick={message} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <MessageSquare />} Message
      </Button>
    ) : (
      <Button size={size} variant="secondary" className={className} disabled>
        <Check /> Connected
      </Button>
    )
  }
  if (current.status === "outgoing") {
    return (
      <Button size={size} variant="secondary" className={className} disabled>
        <Clock /> Pending
      </Button>
    )
  }
  if (current.status === "incoming") {
    return (
      <Button
        size={size}
        className={className}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await respondToConnection(current.id, true)
            if (r.ok) {
              toast.success("Connected!")
              setCurrent({ status: "connected", id: current.id })
              router.refresh()
            } else toast.error(r.error)
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <Check />} Accept request
      </Button>
    )
  }
  return (
    <>
      <Button size={size} className={className} onClick={() => setOpen(true)}>
        <UserPlus /> Connect
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect with {targetName}</DialogTitle>
            <DialogDescription>Add a short note — personalised requests are much more likely to be accepted.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Hi ${targetName.split(" ")[0]}, I'm building… and I'd love to connect because…`}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={send} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function MessageButton({ targetId, size = "sm", variant = "outline", className, label = "Message" }: { targetId: string; size?: Size; variant?: React.ComponentProps<typeof Button>["variant"]; className?: string; label?: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await startConversation(targetId)
          if (r.ok && r.data) router.push(`/messages/${r.data.id}`)
          else if (!r.ok) toast.error(r.error)
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <MessageSquare />} {label}
    </Button>
  )
}
