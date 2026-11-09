"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, LogOut, Plus } from "lucide-react"
import { toast } from "sonner"
import { joinCommunity, leaveCommunity } from "@/actions/communities"
import { Button } from "@/components/ui/button"

export function JoinButton({ communityId, slug, joined, size = "sm", full = true }: { communityId: string; slug: string; joined: boolean; size?: React.ComponentProps<typeof Button>["size"]; full?: boolean }) {
  const [isJoined, setJoined] = useState(joined)
  const [hover, setHover] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()
  const run = () =>
    start(async () => {
      const r = isJoined ? await leaveCommunity(communityId, slug) : await joinCommunity(communityId, slug)
      if (r.ok) {
        setJoined(!isJoined)
        toast.success(r.message)
        router.refresh()
      } else toast.error(r.error)
    })
  if (isJoined) {
    return (
      <Button
        variant={hover ? "destructive" : "secondary"}
        size={size}
        className={full ? "w-full" : undefined}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={run}
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : hover ? <LogOut /> : <Check />}
        {hover ? "Leave" : "Joined"}
      </Button>
    )
  }
  return (
    <Button size={size} className={full ? "w-full" : undefined} onClick={run} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Plus />} Join community
    </Button>
  )
}
