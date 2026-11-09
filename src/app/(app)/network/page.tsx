import type { Metadata } from "next"
import Link from "next/link"
import { UserPlus, Users } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EmptyState, PageHeader, Panel } from "@/components/shared/page-header"
import { LinkButton } from "@/components/shared/link-button"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import { MessageButton } from "@/components/network/connect-button"
import { ConnectionActions } from "./connection-actions"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "My network" }

const PERSON = "id, full_name, avatar_url, headline"

export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: t } = await searchParams
  const tab = t === "requests" ? "requests" : t === "sent" ? "sent" : "connections"
  const me = await requireProfile()
  const supabase = await createClient()
  const { data } = await supabase
    .from("connections")
    .select(`id, status, message, created_at, responded_at, requester_id, addressee_id, requester:profiles!connections_requester_id_fkey(${PERSON}), addressee:profiles!connections_addressee_id_fkey(${PERSON})`)
    .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`)
    .order("created_at", { ascending: false })
  const rows = data ?? []
  const connections = rows.filter((r) => r.status === "accepted")
  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === me.id)
  const sent = rows.filter((r) => r.status === "pending" && r.requester_id === me.id)
  const list = tab === "requests" ? incoming : tab === "sent" ? sent : connections

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="My network" description="Your connections and pending requests." actions={<LinkButton href="/discover?tab=recommended"><UserPlus /> Find founders</LinkButton>} />
      <div className="mb-5 flex gap-1 border-b">
        {[
          ["connections", `Connections (${connections.length})`],
          ["requests", `Requests (${incoming.length})`],
          ["sent", `Sent (${sent.length})`],
        ].map(([k, label]) => (
          <Link key={k} href={k === "connections" ? "/network" : `/network?tab=${k}`} className={cn("-mb-px border-b-2 px-3 py-2.5 text-sm font-medium", tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        ))}
      </div>
      {list.length ? (
        <Panel className="divide-y">
          {list.map((c) => {
            const other = c.requester_id === me.id ? c.addressee : c.requester
            if (!other) return null
            return (
              <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Link href={`/founders/${other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar name={other.full_name} src={other.avatar_url} />
                  <div className="min-w-0">
                    <p className="font-medium">{other.full_name}</p>
                    <p className="truncate text-sm text-muted-foreground">{other.headline}</p>
                    {c.message && tab !== "connections" && <p className="mt-1 line-clamp-2 text-sm text-foreground/80 italic">&ldquo;{c.message}&rdquo;</p>}
                    <p className="text-xs text-muted-foreground">
                      {tab === "connections" ? "Connected " : tab === "requests" ? "Received " : "Sent "}
                      <RelativeTime date={tab === "connections" ? c.responded_at ?? c.created_at : c.created_at} />
                    </p>
                  </div>
                </Link>
                <div className="flex gap-2">
                  {tab === "connections" && <MessageButton targetId={other.id} />}
                  <ConnectionActions id={c.id} mode={tab} />
                </div>
              </div>
            )
          })}
        </Panel>
      ) : (
        <EmptyState
          icon={Users}
          title={tab === "requests" ? "No pending requests" : tab === "sent" ? "No sent requests" : "No connections yet"}
          description={tab === "connections" ? "Your recommendations are a great place to start." : undefined}
        />
      )}
    </div>
  )
}
