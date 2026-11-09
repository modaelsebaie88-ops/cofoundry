import type { Metadata } from "next"
import { MessagesSquare } from "lucide-react"
import { LinkButton } from "@/components/shared/link-button"

export const metadata: Metadata = { title: "Messages" }

export default function MessagesIndex() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center p-8 text-center md:flex">
      <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <MessagesSquare className="size-6" />
      </div>
      <p className="font-medium">Select a conversation</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">Or start a new one from a founder&apos;s profile. Messages update in real time.</p>
      <LinkButton href="/discover" variant="outline" className="mt-4">
        Find founders
      </LinkButton>
    </div>
  )
}
