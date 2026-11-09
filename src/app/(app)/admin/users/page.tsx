import type { Metadata } from "next"
import Link from "next/link"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth"
import { DemoBadge, Tag, VerifiedBadge } from "@/components/shared/badges"
import { Panel } from "@/components/shared/page-header"
import { Pagination } from "@/components/shared/pagination"
import { UserAvatar } from "@/components/shared/user-avatar"
import { UserControls } from "./user-controls"

export const metadata: Metadata = { title: "Users · Admin" }
const PAGE = 25

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const supabase = await createClient()
  const me = await getCurrentProfile()
  const { data, error } = await supabase.rpc("admin_list_users", { q: sp.q ?? "", lim: PAGE, off: (page - 1) * PAGE })
  const total = Number(data?.[0]?.total ?? 0)
  return (
    <div>
      <form className="mb-4 flex gap-2" action="/admin/users">
        <input name="q" defaultValue={sp.q} placeholder="Search by name or email" className="h-9 w-full max-w-sm rounded-lg border bg-white px-3 text-sm outline-none focus:border-ring" />
      </form>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Startup</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Role & actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).map((u) => (
              <tr key={u.id} className={u.is_suspended ? "bg-destructive/5" : undefined}>
                <td className="px-4 py-3">
                  <Link href={`/founders/${u.id}`} className="flex items-center gap-2.5">
                    <UserAvatar name={u.full_name} src={u.avatar_url} size="sm" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 font-medium">
                        {u.full_name || "—"} {u.is_verified && <VerifiedBadge />} {u.is_demo && <DemoBadge />}
                      </span>
                      <span className="block text-xs text-muted-foreground">{u.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.startup_name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</td>
                <td className="px-4 py-3">
                  {u.is_suspended ? <Tag className="bg-destructive/10 text-destructive">Suspended</Tag> : u.onboarding_completed ? <Tag tone="success">Active</Tag> : <Tag>Onboarding</Tag>}
                </td>
                <td className="px-4 py-3">
                  <UserControls id={u.id} role={u.role} suspended={u.is_suspended} verified={u.is_verified} isSelf={u.id === me?.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Pagination page={page} pageSize={PAGE} total={total} />
    </div>
  )
}
