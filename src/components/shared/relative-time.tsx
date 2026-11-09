"use client"

import { format, formatDistanceStrict } from "date-fns"
import { useEffect, useState } from "react"

/** Relative time ("5 minutes ago") that refreshes every minute. */
export function RelativeTime({ date, className }: { date: string | Date; className?: string }) {
  const d = typeof date === "string" ? new Date(date) : date
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  const diff = now - d.getTime()
  const label = diff < 45_000 ? "just now" : `${formatDistanceStrict(d, now)} ago`
  return (
    <time dateTime={d.toISOString()} title={format(d, "PPpp")} className={className} suppressHydrationWarning>
      {label}
    </time>
  )
}
