"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { useLinkStatus } from "next/link"

/**
 * Render inside a `<Link>`: shows the given icon, swapped for a same-size spinner
 * while that link's navigation is pending, so slow server renders don't look like dead clicks.
 */
export function LinkPendingIcon({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus()
  return pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : children
}
