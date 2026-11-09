"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type RealtimeState = {
  userId: string
  online: Set<string>
  unreadNotifications: number
  unreadMessages: number
  setUnreadNotifications: (fn: (n: number) => number) => void
  setUnreadMessages: (fn: (n: number) => number) => void
}

const Ctx = createContext<RealtimeState | null>(null)

/**
 * App-wide realtime: online presence (Supabase Realtime Presence), live
 * notification counts and unread-message counts (postgres_changes, filtered
 * server-side by RLS).
 */
export function RealtimeProvider({
  userId,
  initialNotifications,
  initialMessages,
  children,
}: {
  userId: string
  initialNotifications: number
  initialMessages: number
  children: React.ReactNode
}) {
  const [online, setOnline] = useState<Set<string>>(new Set([userId]))
  const [unreadNotifications, setUnreadNotifications] = useState(initialNotifications)
  const [unreadMessages, setUnreadMessages] = useState(initialMessages)
  const [prevCounts, setPrevCounts] = useState({ n: initialNotifications, m: initialMessages })
  const supabase = createClient() // browser client is a singleton

  // Server counts change when the user navigates (router.refresh); adopt them during render.
  if (prevCounts.n !== initialNotifications || prevCounts.m !== initialMessages) {
    setPrevCounts({ n: initialNotifications, m: initialMessages })
    setUnreadNotifications(initialNotifications)
    setUnreadMessages(initialMessages)
  }

  useEffect(() => {
    supabase.rpc("touch_last_seen").then(() => {})
    const presence = supabase.channel("presence:online", { config: { presence: { key: userId } } })
    presence
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(presence.presenceState())))
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await presence.track({ at: Date.now() })
      })

    const changes = supabase
      .channel(`user:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        () => setUnreadNotifications((n) => n + 1)
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as { sender_id: string }
        // Only rows from conversations we belong to are delivered (RLS). Ignore our own.
        if (row.sender_id !== userId) setUnreadMessages((n) => n + 1)
      })
      .subscribe()

    const heartbeat = setInterval(() => supabase.rpc("touch_last_seen").then(() => {}), 5 * 60_000)
    return () => {
      clearInterval(heartbeat)
      supabase.removeChannel(presence)
      supabase.removeChannel(changes)
    }
  }, [supabase, userId])

  const value = useMemo(
    () => ({ userId, online, unreadNotifications, unreadMessages, setUnreadNotifications, setUnreadMessages }),
    [userId, online, unreadNotifications, unreadMessages]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRealtime() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useRealtime must be used inside RealtimeProvider")
  return ctx
}

export function useIsOnline(id: string) {
  return useContext(Ctx)?.online.has(id) ?? false
}
