"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LinkButton } from "@/components/shared/link-button"

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted-foreground">An unexpected error occurred while loading this page. You can try again — if it keeps happening, let us know.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RotateCcw /> Try again
        </Button>
        <LinkButton href="/dashboard" variant="outline">
          Go to dashboard
        </LinkButton>
      </div>
    </div>
  )
}
