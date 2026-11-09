"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, KeyRound, ShieldCheck, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/settings/profile", label: "Profile", icon: UserRound },
  { href: "/settings/account", label: "Account & security", icon: KeyRound },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/verification", label: "Verification", icon: ShieldCheck },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Settings">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
            pathname === i.href ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <i.icon className="size-4" /> {i.label}
        </Link>
      ))}
    </nav>
  )
}
