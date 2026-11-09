"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Flag, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { addMilestone, deleteMilestone } from "@/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Milestone = { id: string; title: string; description: string | null; achieved_on: string | null }

export function MilestonesEditor({ milestones }: { milestones: Milestone[] }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <div className="space-y-5">
      {milestones.length > 0 ? (
        <ol className="relative space-y-4 border-l pl-5">
          {milestones.map((m) => (
            <li key={m.id} className="group relative">
              <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-primary ring-4 ring-accent" />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  {m.achieved_on && <p className="text-xs text-muted-foreground">{format(new Date(m.achieved_on), "MMMM yyyy")}</p>}
                  {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete milestone"
                  onClick={() =>
                    start(async () => {
                      const r = await deleteMilestone(m.id)
                      r.ok ? router.refresh() : toast.error(r.error)
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Flag className="size-4" /> Add launches, funding rounds, customers or awards.
        </p>
      )}
      <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milestone, e.g. “Launched beta”" maxLength={140} aria-label="Milestone title" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details (optional)" maxLength={1000} aria-label="Milestone details" />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <Button
          disabled={pending || !title.trim()}
          onClick={() =>
            start(async () => {
              const r = await addMilestone({ title, description, achieved_on: date || undefined })
              if (r.ok) {
                setTitle("")
                setDescription("")
                setDate("")
                router.refresh()
              } else toast.error(r.error)
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
        </Button>
      </div>
    </div>
  )
}
