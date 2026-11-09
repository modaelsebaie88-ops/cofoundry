import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { ConversationList, type ConversationSummary } from "./conversation-list"

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const me = await requireProfile()
  const supabase = await createClient()
  const [{ data: conversations }, { data: connections }] = await Promise.all([
    supabase.rpc("get_my_conversations"),
    supabase
      .from("connections")
      .select("requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url), addressee:profiles!connections_addressee_id_fkey(id, full_name, avatar_url)")
      .eq("status", "accepted")
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`),
  ])
  const contacts = (connections ?? []).map((c) => (c.requester?.id === me.id ? c.addressee : c.requester)).filter(Boolean) as {
    id: string
    full_name: string
    avatar_url: string | null
  }[]

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8">
      <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden border-b bg-card">
        <ConversationList meId={me.id} conversations={(conversations ?? []) as ConversationSummary[]} contacts={contacts} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
