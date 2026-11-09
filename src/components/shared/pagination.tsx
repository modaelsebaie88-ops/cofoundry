"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  const go = (p: number) => {
    const next = new URLSearchParams(params.toString())
    next.set("page", String(p))
    router.push(`${pathname}?${next.toString()}`)
  }
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>
        <ChevronLeft /> Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => go(page + 1)}>
        Next <ChevronRight />
      </Button>
    </nav>
  )
}
