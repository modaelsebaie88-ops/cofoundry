"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Bookmark, LogOut, Menu, MessagesSquare, Search, Settings, User, UsersRound } from "lucide-react"
import { signOut } from "@/actions/auth"
import { NotificationBell } from "@/components/shell/notification-bell"
import { useRealtime } from "@/components/shell/realtime-provider"
import { NavLinks } from "@/components/shell/sidebar"
import { Logo } from "@/components/shell/logo"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ROLES, type AppRole } from "@/lib/constants"

export function Topbar({
  user,
  isModerator,
}: {
  user: { id: string; full_name: string; avatar_url: string | null; headline: string | null; role: AppRole }
  isModerator: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { unreadMessages } = useRealtime()
  const router = useRouter()

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" />}>
          <Menu />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="mb-6 block px-2">
            <Logo />
          </Link>
          <div className="flex h-[calc(100%-4rem)] flex-col overflow-y-auto">
            <NavLinks isAdmin={user.role === "admin"} isModerator={isModerator} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <Link href="/dashboard" className="lg:hidden">
        <span className="sr-only">Cofoundry</span>
        <Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
      </Link>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="relative" aria-label="Messages" onClick={() => router.push("/messages")}>
          <MessagesSquare className="size-[18px]" />
          {unreadMessages > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />}
        </Button>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="ml-1 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40" aria-label="Account menu" />}>
            <UserAvatar name={user.full_name} src={user.avatar_url} size="sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium text-foreground">{user.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{ROLES[user.role]}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/founders/${user.id}`)}>
              <User /> View my profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/network")}>
              <UsersRound /> My network
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/saved")}>
              <Bookmark /> Saved items
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function GlobalSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get("q") ?? "")
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <form
      role="search"
      className="relative ml-1 hidden max-w-md flex-1 sm:block"
      onSubmit={(e) => {
        e.preventDefault()
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`)
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search founders, startups, communities…"
        aria-label="Search Cofoundry"
        className="h-9 w-full rounded-lg border border-transparent bg-muted/70 pr-12 pl-9 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:bg-white focus:ring-3 focus:ring-ring/25"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-white px-1.5 text-[10px] font-medium text-muted-foreground md:block">
        Ctrl K
      </kbd>
    </form>
  )
}
