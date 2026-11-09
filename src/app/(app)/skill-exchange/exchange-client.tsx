"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MoreHorizontal, Plus, Repeat2 } from "lucide-react"
import { toast } from "sonner"
import { createExchange, deleteExchange, proposeExchange, setExchangeStatus } from "@/actions/exchange"
import { Field } from "@/components/shared/form"
import { NativeSelect } from "@/components/shared/native-select"
import { TagInput } from "@/components/shared/tag-input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function CreateExchangeDialog({ skillSuggestions }: { skillSuggestions: string[] }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [offer, setOffer] = useState<string[]>([])
  const [want, setWant] = useState<string[]>([])
  const [description, setDescription] = useState("")
  const [format, setFormat] = useState("any")
  const [fe, setFe] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> New exchange
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>List a skill exchange</DialogTitle>
            <DialogDescription>What can you offer, and what would you like in return?</DialogDescription>
          </DialogHeader>
          <Field label="Title" error={fe.title}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="e.g. Growth marketing help for frontend pairing" />
          </Field>
          <Field label="Skills you offer" error={fe.offer_skills}>
            <TagInput value={offer} onChange={setOffer} suggestions={skillSuggestions} max={10} />
          </Field>
          <Field label="Skills you want" error={fe.want_skills}>
            <TagInput value={want} onChange={setWant} suggestions={skillSuggestions} max={10} />
          </Field>
          <Field label="Format">
            <NativeSelect value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="any">Flexible</option>
              <option value="async">Async help (docs, reviews)</option>
              <option value="calls">Video calls</option>
              <option value="pairing">Pairing sessions</option>
            </NativeSelect>
          </Field>
          <Field label="Details (optional)">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await createExchange({ title, offer_skills: offer, want_skills: want, description, format })
                  if (r.ok) {
                    toast.success(r.message)
                    setOpen(false)
                    setTitle("")
                    setOffer([])
                    setWant([])
                    setDescription("")
                    router.refresh()
                  } else {
                    setFe(r.fieldErrors ?? {})
                    toast.error(r.error)
                  }
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

export function ProposeButton({ exchangeId, authorName }: { exchangeId: string; authorName: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Repeat2 /> Propose exchange
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose an exchange to {authorName.split(" ")[0]}</DialogTitle>
            <DialogDescription>This opens a direct conversation with your proposal as the first message.</DialogDescription>
          </DialogHeader>
          <Textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} placeholder="What you can help with, what you'd like in return, and a suggested first session." />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || note.trim().length < 10}
              onClick={() =>
                start(async () => {
                  const r = await proposeExchange(exchangeId, note)
                  if (r.ok && r.data) router.push(`/messages/${r.data.conversationId}`)
                  else if (!r.ok) toast.error(r.error)
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Send proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ExchangeOwnerMenu({ id, status }: { id: string; status: "open" | "closed" }) {
  const [, start] = useTransition()
  const router = useRouter()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Listing options" />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            start(async () => {
              const r = await setExchangeStatus(id, status === "open" ? "closed" : "open")
              r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
            })
          }
        >
          {status === "open" ? "Close listing" : "Reopen listing"}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            start(async () => {
              if (!confirm("Delete this listing?")) return
              const r = await deleteExchange(id)
              r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
            })
          }
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
