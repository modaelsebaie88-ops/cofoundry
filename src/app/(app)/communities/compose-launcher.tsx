"use client"

import { useState } from "react"
import { PenSquare } from "lucide-react"
import { PostComposer } from "@/components/communities/post-composer"
import { NativeSelect } from "@/components/shared/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** "Publish a post" entry point from anywhere: pick one of your communities, then compose. */
export function ComposeLauncher({ communities, defaultOpen }: { communities: { id: string; name: string; slug: string }[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? "")
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!communities.length} title={communities.length ? undefined : "Join a community first"}>
        <PenSquare /> New post
      </Button>
      <Dialog open={open && communities.length > 0} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Publish a post</DialogTitle>
            <DialogDescription>Share a question, start a discussion or run a poll.</DialogDescription>
          </DialogHeader>
          <NativeSelect value={communityId} onChange={(e) => setCommunityId(e.target.value)} aria-label="Community">
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <PostComposer key={communityId} communityId={communityId} canAnnounce={false} onPosted={() => setOpen(false)} navigateOnPost />
        </DialogContent>
      </Dialog>
    </>
  )
}
