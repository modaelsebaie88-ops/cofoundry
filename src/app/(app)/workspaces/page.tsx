import type { Metadata } from "next"
import Link from "next/link"
import { SquareKanban } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { RelativeTime } from "@/components/shared/relative-time"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Progress } from "@/components/ui/progress"
import { CreateWorkspaceDialog } from "./create-workspace"

export const metadata: Metadata = { title: "Workspaces" }

export default async function WorkspacesPage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const [{ data: memberships }, { data: connections }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role, workspaces(id, name, description, updated_at, workspace_members(profiles(id, full_name, avatar_url)), workspace_tasks(status))")
      .eq("profile_id", me.id),
    supabase
      .from("connections")
      .select("requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url), addressee:profiles!connections_addressee_id_fkey(id, full_name, avatar_url)")
      .eq("status", "accepted")
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`),
  ])
  const contacts = (connections ?? []).map((c) => (c.requester?.id === me.id ? c.addressee : c.requester)).filter(Boolean) as { id: string; full_name: string; avatar_url: string | null }[]
  const workspaces = (memberships ?? []).filter((m) => m.workspaces).sort((a, b) => +new Date(b.workspaces!.updated_at) - +new Date(a.workspaces!.updated_at))

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Private spaces to move from networking to building: shared tasks, milestones, discussions and files with your collaborators."
        actions={<CreateWorkspaceDialog contacts={contacts} />}
      />
      {workspaces.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map(({ role, workspaces: w }) => {
            const tasks = w!.workspace_tasks
            const done = tasks.filter((t) => t.status === "done").length
            return (
              <Link key={w!.id} href={`/workspaces/${w!.id}`} className="card-hover flex flex-col rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-gradient text-white">
                    <SquareKanban className="size-5" />
                  </span>
                  {role === "owner" && <span className="text-xs font-medium text-primary">Owner</span>}
                </div>
                <p className="mt-3 font-semibold">{w!.name}</p>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{w!.description ?? "No description"}</p>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {done}/{tasks.length} tasks done
                    </span>
                    <span>
                      Updated <RelativeTime date={w!.updated_at} />
                    </span>
                  </div>
                  <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} />
                </div>
                <div className="mt-4 flex -space-x-2">
                  {w!.workspace_members.slice(0, 6).map((m) => m.profiles && <UserAvatar key={m.profiles.id} name={m.profiles.full_name} src={m.profiles.avatar_url} size="sm" className="rounded-full ring-2 ring-white" />)}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={SquareKanban}
          title="No workspaces yet"
          description="Connected with a potential co-founder or collaborator? Create a workspace to plan your first project together."
          action={<CreateWorkspaceDialog contacts={contacts} />}
        />
      )}
    </div>
  )
}
