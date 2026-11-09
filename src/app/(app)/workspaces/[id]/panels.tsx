"use client"

import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format, isPast } from "date-fns"
import { CalendarClock, CheckCircle2, Circle, Download, FileText, Flag, Loader2, Megaphone, MessageSquare, Plus, Trash2, Upload, UserMinus } from "lucide-react"
import { toast } from "sonner"
import {
  createMilestone,
  createTask,
  createWorkspacePost,
  deleteFile,
  deleteMilestone,
  deleteTask,
  deleteWorkspace,
  deleteWorkspacePost,
  inviteMember,
  recordFile,
  removeMember,
  toggleMilestone,
  updateTask,
  updateWorkspace,
} from "@/actions/workspaces"
import { Tag } from "@/components/shared/badges"
import { NativeSelect } from "@/components/shared/native-select"
import { EmptyState, Panel, SectionTitle } from "@/components/shared/page-header"
import { RelativeTime } from "@/components/shared/relative-time"
import { RichText } from "@/components/shared/rich-text"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { cn, formatBytes } from "@/lib/utils"

type Person = { id: string; full_name: string; avatar_url: string | null; headline: string | null; role: string }
type Task = { id: string; title: string; description: string | null; status: "todo" | "in_progress" | "done"; assignee_id: string | null; due_date: string | null; created_by: string; created_at: string }
type Milestone = { id: string; title: string; description: string | null; due_date: string | null; completed_at: string | null }
type Post = { id: string; kind: "update" | "discussion"; body: string; created_at: string; author: { id: string; full_name: string; avatar_url: string | null } | null }
type FileRow = { id: string; name: string; path: string; size: number | null; mime: string | null; created_at: string; uploaded_by: string; uploader: { full_name: string } | null }

function useAction() {
  const [pending, start] = useTransition()
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn()
      if (r.ok) {
        if (r.message) toast.success(r.message)
        after?.()
        router.refresh()
      } else toast.error(r.error)
    })
  return { pending, run }
}

/** Live-refreshes the workspace when collaborators change tasks. */
export function WorkspaceLive({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`ws:${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_tasks", filter: `workspace_id=eq.${workspaceId}` }, () => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => router.refresh(), 300)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [workspaceId, router])
  return null
}

// --------------------------------------------------------------------------- Overview
export function Overview({
  workspace,
  people,
  tasks,
  milestones,
  posts,
  isOwner,
}: {
  workspace: { id: string; name: string; description: string | null }
  people: Person[]
  tasks: Task[]
  milestones: Milestone[]
  posts: Post[]
  isOwner: boolean
}) {
  const done = tasks.filter((t) => t.status === "done").length
  const nextMilestone = milestones.find((m) => !m.completed_at)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description ?? "")
  const { pending, run } = useAction()
  const router = useRouter()
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Tasks done", `${done}/${tasks.length}`],
            ["In progress", tasks.filter((t) => t.status === "in_progress").length],
            ["Milestones hit", `${milestones.filter((m) => m.completed_at).length}/${milestones.length}`],
          ].map(([l, v]) => (
            <Panel key={l} className="p-4">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="mt-1 text-2xl font-semibold">{v}</p>
            </Panel>
          ))}
        </div>
        <Panel className="p-5">
          <SectionTitle>Progress</SectionTitle>
          <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} />
          {nextMilestone && (
            <p className="mt-4 flex items-center gap-2 text-sm">
              <Flag className="size-4 text-primary" /> Next milestone: <span className="font-medium">{nextMilestone.title}</span>
              {nextMilestone.due_date && <span className="text-muted-foreground">· due {format(new Date(nextMilestone.due_date), "MMM d")}</span>}
            </p>
          )}
        </Panel>
        <Panel className="p-5">
          <SectionTitle action={<Link href={`/workspaces/${workspace.id}?tab=discussions`} className="text-xs font-medium text-primary hover:underline">All</Link>}>Recent updates</SectionTitle>
          {posts.length ? (
            <ul className="space-y-4">
              {posts.slice(0, 4).map((p) => (
                <li key={p.id} className="flex gap-3">
                  <UserAvatar name={p.author?.full_name} src={p.author?.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{p.author?.full_name}</span> · {p.kind === "update" ? "project update" : "discussion"} · <RelativeTime date={p.created_at} />
                    </p>
                    <p className="line-clamp-2 text-sm">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No updates yet. Post a project update to keep everyone aligned.</p>
          )}
        </Panel>
      </div>
      <aside className="space-y-6">
        <Panel className="p-5">
          <SectionTitle>Members</SectionTitle>
          <ul className="space-y-2">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <UserAvatar name={p.full_name} src={p.avatar_url} size="xs" /> {p.full_name}
                {p.role === "owner" && <Tag className="ml-auto">Owner</Tag>}
              </li>
            ))}
          </ul>
        </Panel>
        {isOwner && (
          <Panel className="p-5">
            <SectionTitle>Workspace settings</SectionTitle>
            {editing ? (
              <div className="space-y-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" disabled={pending} onClick={() => run(() => updateWorkspace(workspace.id, { name, description }), () => setEditing(false))}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full" onClick={() => setEditing(true)}>
                  Edit name & description
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Delete this workspace, its tasks, discussions and files?")) run(() => deleteWorkspace(workspace.id), () => router.push("/workspaces"))
                  }}
                >
                  Delete workspace
                </Button>
              </div>
            )}
          </Panel>
        )}
      </aside>
    </div>
  )
}

// --------------------------------------------------------------------------- Tasks
const COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
]

export function TaskBoard({ workspaceId, tasks, people, meId }: { workspaceId: string; tasks: Task[]; people: Person[]; meId: string }) {
  const [title, setTitle] = useState("")
  const [assignee, setAssignee] = useState("")
  const [due, setDue] = useState("")
  const { pending, run } = useAction()
  const name = (id: string | null) => people.find((p) => p.id === id)
  return (
    <div className="space-y-4">
      <Panel className="grid gap-2 p-3 sm:grid-cols-[1fr_200px_160px_auto]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" maxLength={200} aria-label="Task title" />
        <NativeSelect value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee" className="h-8">
          <option value="">Unassigned</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === meId ? "Me" : p.full_name}
            </option>
          ))}
        </NativeSelect>
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
        <Button
          disabled={pending || !title.trim()}
          onClick={() =>
            run(
              () => createTask(workspaceId, { title, assignee_id: assignee || null, due_date: due || null }),
              () => {
                setTitle("")
                setDue("")
              }
            )
          }
        >
          <Plus /> Add
        </Button>
      </Panel>
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = tasks.filter((t) => t.status === col.key)
          return (
            <div key={col.key} className="rounded-2xl border bg-muted/40 p-3">
              <p className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
                {col.label} <span className="text-xs text-muted-foreground">{list.length}</span>
              </p>
              <ul className="space-y-2">
                {list.map((t) => {
                  const a = name(t.assignee_id)
                  const overdue = t.due_date && t.status !== "done" && isPast(new Date(t.due_date + "T23:59:59"))
                  return (
                    <li key={t.id} className="group rounded-xl border bg-white p-3 shadow-sm">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          aria-label={t.status === "done" ? "Mark not done" : "Mark done"}
                          onClick={() => run(() => updateTask(workspaceId, t.id, { status: t.status === "done" ? "todo" : "done" }))}
                          className="mt-0.5 text-muted-foreground hover:text-primary"
                        >
                          {t.status === "done" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className="size-4" />}
                        </button>
                        <p className={cn("flex-1 text-sm", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</p>
                        <button type="button" aria-label="Delete task" onClick={() => run(() => deleteTask(workspaceId, t.id))} className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                        <NativeSelect
                          aria-label="Status"
                          value={t.status}
                          onChange={(e) => run(() => updateTask(workspaceId, t.id, { status: e.target.value as Task["status"] }))}
                          className="h-7 w-32 pr-7 pl-2 text-xs"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </NativeSelect>
                        <NativeSelect
                          aria-label="Assignee"
                          value={t.assignee_id ?? ""}
                          onChange={(e) => run(() => updateTask(workspaceId, t.id, { assignee_id: e.target.value || null }))}
                          className="h-7 w-32 pr-7 pl-2 text-xs"
                        >
                          <option value="">Unassigned</option>
                          {people.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name.split(" ")[0]}
                            </option>
                          ))}
                        </NativeSelect>
                        {a && <UserAvatar name={a.full_name} src={a.avatar_url} size="xs" />}
                        {t.due_date && (
                          <span className={cn("flex items-center gap-1 text-[11px]", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                            <CalendarClock className="size-3" /> {format(new Date(t.due_date + "T00:00:00"), "MMM d")}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
                {!list.length && <li className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Nothing here</li>}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------- Milestones
export function Milestones({ workspaceId, milestones }: { workspaceId: string; milestones: Milestone[] }) {
  const [title, setTitle] = useState("")
  const [due, setDue] = useState("")
  const { pending, run } = useAction()
  return (
    <Panel className="p-5 sm:p-6">
      <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milestone, e.g. “Pilot live with first clinic”" maxLength={200} />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
        <Button disabled={pending || !title.trim()} onClick={() => run(() => createMilestone(workspaceId, { title, due_date: due || undefined }), () => (setTitle(""), setDue("")))}>
          <Plus /> Add milestone
        </Button>
      </div>
      {milestones.length ? (
        <ol className="relative space-y-4 border-l pl-6">
          {milestones.map((m) => (
            <li key={m.id} className="group relative">
              <button
                type="button"
                aria-label={m.completed_at ? "Mark incomplete" : "Mark complete"}
                onClick={() => run(() => toggleMilestone(workspaceId, m.id, !m.completed_at))}
                className="absolute top-0.5 -left-[33px] rounded-full bg-white"
              >
                {m.completed_at ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Circle className="size-5 text-primary/50" />}
              </button>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn("font-medium", m.completed_at && "text-muted-foreground line-through")}>{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.due_date ? `Due ${format(new Date(m.due_date + "T00:00:00"), "MMM d, yyyy")}` : "No due date"}
                    {m.completed_at && ` · completed ${format(new Date(m.completed_at), "MMM d")}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" aria-label="Delete milestone" onClick={() => run(() => deleteMilestone(workspaceId, m.id))}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Define the milestones that matter for this collaboration.</p>
      )}
    </Panel>
  )
}

// --------------------------------------------------------------------------- Discussions
export function Discussions({ workspaceId, posts, meId, isOwner }: { workspaceId: string; posts: Post[]; meId: string; isOwner: boolean }) {
  const [body, setBody] = useState("")
  const [kind, setKind] = useState<"discussion" | "update">("discussion")
  const { pending, run } = useAction()
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Panel className="p-4">
        <div className="mb-2 flex gap-1.5">
          {(["discussion", "update"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={cn("flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium", kind === k ? "border-primary/30 bg-accent text-accent-foreground" : "bg-white text-muted-foreground")}>
              {k === "update" ? <Megaphone className="size-3" /> : <MessageSquare className="size-3" />} {k === "update" ? "Project update" : "Discussion"}
            </button>
          ))}
        </div>
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={6000} placeholder={kind === "update" ? "What shipped, what's blocked, what's next?" : "Start a discussion with your collaborators…"} />
        <div className="mt-2 flex justify-end">
          <Button disabled={pending || !body.trim()} onClick={() => run(() => createWorkspacePost(workspaceId, kind, body), () => setBody(""))}>
            {pending && <Loader2 className="animate-spin" />} Post
          </Button>
        </div>
      </Panel>
      {posts.length ? (
        posts.map((p) => (
          <Panel key={p.id} className="p-5">
            <div className="flex items-start gap-3">
              <UserAvatar name={p.author?.full_name} src={p.author?.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{p.author?.full_name}</span>{" "}
                  {p.kind === "update" && <Tag tone="primary">Update</Tag>} <RelativeTime date={p.created_at} className="text-xs text-muted-foreground" />
                </p>
                <RichText text={p.body} className="mt-1" />
              </div>
              {(p.author?.id === meId || isOwner) && (
                <Button variant="ghost" size="icon-sm" aria-label="Delete post" onClick={() => run(() => deleteWorkspacePost(workspaceId, p.id))}>
                  <Trash2 />
                </Button>
              )}
            </div>
          </Panel>
        ))
      ) : (
        <EmptyState icon={MessageSquare} title="No discussions yet" />
      )}
    </div>
  )
}

// --------------------------------------------------------------------------- Files
export function Files({ workspaceId, files, meId, isOwner }: { workspaceId: string; files: FileRow[]; meId: string; isOwner: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { run } = useAction()
  const router = useRouter()

  async function upload(file: File) {
    if (file.size > 50 * 1024 * 1024) return toast.error("Files must be 50 MB or smaller.")
    setUploading(true)
    const supabase = createClient()
    const path = `${workspaceId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\- ]+/g, "_").slice(-120)}`
    const { error } = await supabase.storage.from("workspace-files").upload(path, file, { contentType: file.type || "application/octet-stream" })
    if (error) {
      setUploading(false)
      return toast.error(error.message)
    }
    const r = await recordFile(workspaceId, { name: file.name, path, size: file.size, mime: file.type || null })
    setUploading(false)
    if (r.ok) {
      toast.success("File uploaded")
      router.refresh()
    } else toast.error(r.error)
  }

  async function download(f: FileRow) {
    const { data, error } = await createClient().storage.from("workspace-files").createSignedUrl(f.path, 60, { download: f.name })
    if (error || !data) return toast.error("Couldn't generate a download link.")
    window.location.assign(data.signedUrl)
  }

  return (
    <Panel>
      <div className="flex items-center justify-between border-b p-4">
        <p className="text-sm font-semibold">Shared files ({files.length})</p>
        <Button size="sm" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload file
        </Button>
        <input ref={input} type="file" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]
            e.currentTarget.value = ""
            if (f) upload(f)
          }} />
      </div>
      {files.length ? (
        <ul className="divide-y">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(f.size)} · {f.uploader?.full_name} · <RelativeTime date={f.created_at} />
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Download ${f.name}`} onClick={() => download(f)}>
                <Download />
              </Button>
              {(f.uploaded_by === meId || isOwner) && (
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${f.name}`} onClick={() => confirm(`Delete ${f.name}?`) && run(() => deleteFile(workspaceId, f.id))}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-10 text-center text-sm text-muted-foreground">Upload decks, specs, contracts or designs to share them with the team. Files are private to members.</p>
      )}
    </Panel>
  )
}

// --------------------------------------------------------------------------- Members
export function Members({ workspaceId, people, meId, isOwner, invitable }: { workspaceId: string; people: Person[]; meId: string; isOwner: boolean; invitable: { id: string; full_name: string }[] }) {
  const [who, setWho] = useState("")
  const { pending, run } = useAction()
  const router = useRouter()
  return (
    <Panel className="max-w-2xl">
      {isOwner && (
        <div className="flex gap-2 border-b p-4">
          <NativeSelect value={who} onChange={(e) => setWho(e.target.value)} aria-label="Invite a connection">
            <option value="">{invitable.length ? "Invite one of your connections…" : "All your connections are already members"}</option>
            {invitable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </NativeSelect>
          <Button className="h-10" disabled={pending || !who} onClick={() => run(() => inviteMember(workspaceId, who), () => setWho(""))}>
            <Plus /> Invite
          </Button>
        </div>
      )}
      <ul className="divide-y">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <UserAvatar name={p.full_name} src={p.avatar_url} size="sm" />
            <Link href={`/founders/${p.id}`} className="min-w-0 flex-1">
              <p className="text-sm font-medium">{p.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.headline}</p>
            </Link>
            {p.role === "owner" ? (
              <Tag tone="primary">Owner</Tag>
            ) : p.id === meId ? (
              <Button size="sm" variant="ghost" onClick={() => confirm("Leave this workspace?") && run(() => removeMember(workspaceId, p.id), () => router.push("/workspaces"))}>
                Leave
              </Button>
            ) : isOwner ? (
              <Button size="icon-sm" variant="ghost" aria-label={`Remove ${p.full_name}`} onClick={() => confirm(`Remove ${p.full_name}?`) && run(() => removeMember(workspaceId, p.id))}>
                <UserMinus />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
