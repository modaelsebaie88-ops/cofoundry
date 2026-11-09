"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/shell/logo"
import { useRealtime } from "@/components/shell/realtime-provider"
import { ADMIN_ITEM, MODERATION_ITEM, NAV_SECTIONS, SETTINGS_ITEM, type NavItem } from "@/components/shell/nav-items"
import { cn } from "@/lib/utils"

export function NavLinks({ isAdmin, isModerator, onNavigate }: { isAdmin: boolean; isModerator?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { unreadMessages } = useRealtime()
  const item = (it: NavItem) => {
    const active = pathname === it.href || pathname.startsWith(it.href + "/")
    const Icon = it.icon
    const count = it.badge === "messages" ? unreadMessages : 0
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors",
          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
        <span className="truncate">{it.label}</span>
        {count > 0 && (
          <span className="ml-auto rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    )
  }
  return (
    <nav className="flex flex-1 flex-col gap-5" aria-label="Main">
      {NAV_SECTIONS.map((section, i) => (
        <div key={i} className="space-y-0.5">
          {section.title && <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">{section.title}</p>}
          {section.items.map(item)}
        </div>
      ))}
      <div className="mt-auto space-y-0.5 border-t pt-3">
        {isAdmin && item(ADMIN_ITEM)}
        {isModerator && item(MODERATION_ITEM)}
        {item(SETTINGS_ITEM)}
      </div>
    </nav>
  )
}

export function Sidebar({ isAdmin, isModerator }: { isAdmin: boolean; isModerator: boolean }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar px-3 py-4 lg:flex">
      <Link href="/dashboard" className="mb-6 px-2">
        <Logo />
      </Link>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <NavLinks isAdmin={isAdmin} isModerator={isModerator} />
      </div>
    </aside>
  )
}
