import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Panel } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"
import { Overview, TaskBoard, Milestones, Discussions, Files, Members, WorkspaceLive } from "./panels"

export const metadata: Metadata = { title: "Workspace" }
const TABS = ["overview", "tasks", "milestones", "discussions", "files", "members"] as const

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as (typeof TABS)[number]) : "overview"
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: ws } = await supabase.from("workspaces").select("*").eq("id", id).maybeSingle()
  if (!ws) notFound()

  const [{ data: members }, { data: tasks }, { data: milestones }, { data: posts }, { data: files }, { data: connections }] = await Promise.all([
    supabase.from("workspace_members").select("role, joined_at, profiles(id, full_name, avatar_url, headline)").eq("workspace_id", id),
    supabase.from("workspace_tasks").select("id, title, description, status, assignee_id, due_date, created_by, created_at").eq("workspace_id", id).order("created_at"),
    supabase.from("workspace_milestones").select("id, title, description, due_date, completed_at").eq("workspace_id", id).order("due_date", { nullsFirst: false }),
    supabase
      .from("workspace_posts")
      .select("id, kind, body, created_at, author:profiles!workspace_posts_author_id_fkey(id, full_name, avatar_url)")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("workspace_files")
      .select("id, name, path, size, mime, created_at, uploaded_by, uploader:profiles!workspace_files_uploaded_by_fkey(full_name)")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("connections")
      .select("requester:profiles!connections_requester_id_fkey(id, full_name), addressee:profiles!connections_addressee_id_fkey(id, full_name)")
      .eq("status", "accepted")
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`),
  ])
  const people = (members ?? []).filter((m) => m.profiles).map((m) => ({ ...m.profiles!, role: m.role }))
  const isOwner = people.some((p) => p.id === me.id && p.role === "owner")
  const memberIds = new Set(people.map((p) => p.id))
  const invitable = (connections ?? [])
    .map((c) => (c.requester?.id === me.id ? c.addressee : c.requester))
    .filter((p): p is { id: string; full_name: string } => Boolean(p) && !memberIds.has(p!.id))

  return (
    <div>
      <WorkspaceLive workspaceId={id} />
      <Link href="/workspaces" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Workspaces
      </Link>
      <Panel className="mb-6 overflow-hidden">
        <div className="bg-soft-gradient p-5 sm:p-6">
          <h1 className="text-2xl font-semibold tracking-tight">{ws.name}</h1>
          {ws.description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{ws.description}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Private workspace · {people.length} {people.length === 1 ? "member" : "members"}
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t px-3" aria-label="Workspace sections">
          {TABS.map((t) => (
            <Link
              key={t}
              href={t === "overview" ? `/workspaces/${id}` : `/workspaces/${id}?tab=${t}`}
              className={cn("-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-medium capitalize", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              {t}
            </Link>
          ))}
        </nav>
      </Panel>
      {tab === "overview" && <Overview workspace={ws} people={people} tasks={(tasks ?? []) as never} milestones={milestones ?? []} posts={(posts ?? []) as never} isOwner={isOwner} />}
      {tab === "tasks" && <TaskBoard workspaceId={id} tasks={(tasks ?? []) as never} people={people} meId={me.id} />}
      {tab === "milestones" && <Milestones workspaceId={id} milestones={milestones ?? []} />}
      {tab === "discussions" && <Discussions workspaceId={id} posts={(posts ?? []) as never} meId={me.id} isOwner={isOwner} />}
      {tab === "files" && <Files workspaceId={id} files={(files ?? []) as never} meId={me.id} isOwner={isOwner} />}
      {tab === "members" && <Members workspaceId={id} people={people} meId={me.id} isOwner={isOwner} invitable={invitable} />}
    </div>
  )
}
