"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function AdminNav({ reports, verifications }: { reports: number; verifications: number }) {
  const pathname = usePathname()
  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/verification", label: "Verification", count: verifications },
    { href: "/admin/reports", label: "Reports", count: reports },
    { href: "/admin/communities", label: "Communities" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/resources", label: "Resources" },
    { href: "/admin/settings", label: "Settings" },
  ]
  return (
    <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Admin">
      {items.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href)
        return (
          <Link key={i.href} href={i.href} className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium", active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {i.label}
            {i.count ? <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">{i.count}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}
