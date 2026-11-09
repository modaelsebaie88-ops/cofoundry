"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, HelpCircle, Loader2, Megaphone, MessageSquare, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { createPost } from "@/actions/communities"
import { MentionTextarea } from "@/components/shared/mention-textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const TYPES = [
  { key: "discussion", label: "Discussion", icon: MessageSquare },
  { key: "question", label: "Question", icon: HelpCircle },
  { key: "poll", label: "Poll", icon: BarChart3 },
  { key: "announcement", label: "Announcement", icon: Megaphone, modOnly: true },
] as const

export function PostComposer({
  communityId,
  canAnnounce,
  onPosted,
  navigateOnPost,
}: {
  communityId: string
  canAnnounce: boolean
  onPosted?: () => void
  navigateOnPost?: boolean
}) {
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("discussion")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [pending, start] = useTransition()
  const router = useRouter()

  const submit = () =>
    start(async () => {
      const r = await createPost({ community_id: communityId, type, title, body, poll_options: type === "poll" ? options.filter((o) => o.trim()) : [] })
      if (!r.ok) return void toast.error(r.error)
      toast.success("Posted!")
      setTitle("")
      setBody("")
      setOptions(["", ""])
      onPosted?.()
      if (navigateOnPost && r.data) router.push(`/communities/${r.data.slug}/posts/${r.data.id}`)
      else router.refresh()
    })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Post type">
        {TYPES.filter((t) => !("modOnly" in t) || canAnnounce).map((t) => (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={type === t.key}
            onClick={() => setType(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
              type === t.key ? "border-primary/30 bg-accent text-accent-foreground" : "bg-white text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder={type === "question" ? "What do you want to ask?" : type === "poll" ? "Poll question" : "Title"}
        className="h-10 font-medium"
        aria-label="Title"
      />
      <MentionTextarea
        rows={type === "poll" ? 2 : 4}
        value={body}
        onValueChange={setBody}
        communityId={communityId}
        placeholder={type === "poll" ? "Add context (optional)" : "Share details, context or what you've tried. Type @ to mention someone."}
        aria-label="Body"
      />
      {type === "poll" && (
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <Input value={o} maxLength={120} onChange={(e) => setOptions((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${i + 1}`} className="h-9" />
              {options.length > 2 && (
                <Button variant="ghost" size="icon" onClick={() => setOptions((xs) => xs.filter((_, j) => j !== i))} aria-label="Remove option">
                  <X />
                </Button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button variant="ghost" size="sm" onClick={() => setOptions((xs) => [...xs, ""])}>
              <Plus /> Add option
            </Button>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending || title.trim().length < 3}>
          {pending && <Loader2 className="animate-spin" />} Publish
        </Button>
      </div>
    </div>
  )
}
