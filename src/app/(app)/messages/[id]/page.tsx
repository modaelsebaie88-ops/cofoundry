import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ChatMessage } from "@/components/chat/chat-thread"
import { ConversationView } from "./conversation-view"

export const metadata: Metadata = { title: "Messages" }

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: conversation } = await supabase.from("conversations").select("id, is_group, title, created_by").eq("id", id).maybeSingle()
  if (!conversation) notFound() // RLS: not a participant

  const [{ data: participants }, { data: msgs }] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("profiles!inner(id, full_name, avatar_url, headline, last_seen_at)")
      .eq("conversation_id", id),
    supabase
      .from("messages")
      .select("id, sender_id, body, attachment_path, attachment_name, attachment_mime, attachment_size, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(40),
  ])
  const people = (participants ?? []).map((p) => p.profiles)

  return (
    <ConversationView
      conversation={conversation}
      me={{ id: me.id, full_name: me.full_name, avatar_url: me.avatar_url }}
      people={people}
      initialMessages={((msgs ?? []) as ChatMessage[]).reverse()}
    />
  )
}
