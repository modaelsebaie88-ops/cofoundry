import { Compass } from "lucide-react"
import { LinkButton } from "@/components/shared/link-button"

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
        <Compass className="size-6" />
      </div>
      <h1 className="text-xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">It may have been removed, made private, or the link might be wrong.</p>
      <LinkButton href="/dashboard" className="mt-6">
        Back to dashboard
      </LinkButton>
    </div>
  )
}
