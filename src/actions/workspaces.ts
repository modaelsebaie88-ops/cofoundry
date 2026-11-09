"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"

const rp = (id: string) => revalidatePath(`/workspaces/${id}`)

export async function createWorkspace(input: { name: string; description?: string; members: string[] }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const name = input.name.trim()
    if (name.length < 2 || name.length > 80) return { ok: false, error: "Name must be 2–80 characters." }
    const { supabase, user } = await actionContext()
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name, description: input.description?.trim().slice(0, 2000) || null, created_by: user.id })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    for (const m of input.members) {
      await supabase.from("workspace_members").insert({ workspace_id: data.id, profile_id: m })
    }
    revalidatePath("/workspaces")
    return { ok: true, data: { id: data.id } }
  })
}

export async function updateWorkspace(id: string, input: { name: string; description: string }): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("workspaces").update({ name: input.name.trim().slice(0, 80), description: input.description.trim().slice(0, 2000) || null }).eq("id", id).select("id")
    if (!data?.length) return { ok: false, error: "Only the owner can edit the workspace." }
    rp(id)
    return { ok: true, message: "Workspace updated" }
  })
}

export async function deleteWorkspace(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data: files } = await supabase.from("workspace_files").select("path").eq("workspace_id", id)
    const { data } = await supabase.from("workspaces").delete().eq("id", id).select("id")
    if (!data?.length) return { ok: false, error: "Only the owner can delete the workspace." }
    if (files?.length) await supabase.storage.from("workspace-files").remove(files.map((f) => f.path))
    revalidatePath("/workspaces")
    return { ok: true }
  })
}

export async function inviteMember(workspaceId: string, profileId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { error } = await supabase.from("workspace_members").insert({ workspace_id: workspaceId, profile_id: profileId })
    if (error) return { ok: false, error: /connections/.test(error.message) ? "You can only invite your connections." : /row-level/.test(error.message) ? "Only the owner can invite members." : error.message }
    rp(workspaceId)
    return { ok: true, message: "Member added" }
  })
}

export async function removeMember(workspaceId: string, profileId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("profile_id", profileId).select("profile_id")
    if (!data?.length) return { ok: false, error: "You can't remove this member." }
    rp(workspaceId)
    revalidatePath("/workspaces")
    return { ok: true }
  })
}

const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
})

export async function createTask(workspaceId: string, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = taskSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "Add a task title." }
    const { supabase, user } = await actionContext()
    check(
      await supabase.from("workspace_tasks").insert({
        ...parsed.data,
        description: parsed.data.description || null,
        assignee_id: parsed.data.assignee_id || null,
        due_date: parsed.data.due_date || null,
        workspace_id: workspaceId,
        created_by: user.id,
      })
    )
    rp(workspaceId)
    return { ok: true }
  })
}

export async function updateTask(workspaceId: string, taskId: string, patch: { status?: "todo" | "in_progress" | "done"; assignee_id?: string | null; due_date?: string | null; title?: string }): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("workspace_tasks").update(patch).eq("id", taskId).eq("workspace_id", workspaceId))
    rp(workspaceId)
    return { ok: true }
  })
}

export async function deleteTask(workspaceId: string, taskId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("workspace_tasks").delete().eq("id", taskId).select("id")
    if (!data?.length) return { ok: false, error: "Only the creator or owner can delete this task." }
    rp(workspaceId)
    return { ok: true }
  })
}

export async function createMilestone(workspaceId: string, input: { title: string; description?: string; due_date?: string }): Promise<ActionResult> {
  return runAction(async () => {
    const title = input.title.trim()
    if (!title) return { ok: false, error: "Add a milestone title." }
    const { supabase } = await actionContext()
    check(await supabase.from("workspace_milestones").insert({ workspace_id: workspaceId, title: title.slice(0, 200), description: input.description?.trim() || null, due_date: input.due_date || null }))
    rp(workspaceId)
    return { ok: true }
  })
}

export async function toggleMilestone(workspaceId: string, id: string, done: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("workspace_milestones").update({ completed_at: done ? new Date().toISOString() : null }).eq("id", id))
    rp(workspaceId)
    return { ok: true }
  })
}

export async function deleteMilestone(workspaceId: string, id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("workspace_milestones").delete().eq("id", id))
    rp(workspaceId)
    return { ok: true }
  })
}

export async function createWorkspacePost(workspaceId: string, kind: "update" | "discussion", body: string): Promise<ActionResult> {
  return runAction(async () => {
    const text = body.trim()
    if (!text) return { ok: false, error: "Write something first." }
    const { supabase, user } = await actionContext()
    check(await supabase.from("workspace_posts").insert({ workspace_id: workspaceId, author_id: user.id, kind, body: text.slice(0, 6000) }))
    rp(workspaceId)
    return { ok: true }
  })
}

export async function deleteWorkspacePost(workspaceId: string, id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    check(await supabase.from("workspace_posts").delete().eq("id", id))
    rp(workspaceId)
    return { ok: true }
  })
}

/** Records a file that the client already uploaded to storage (storage RLS checks membership). */
export async function recordFile(workspaceId: string, file: { name: string; path: string; size: number; mime: string | null }): Promise<ActionResult> {
  return runAction(async () => {
    if (!file.path.startsWith(`${workspaceId}/`)) return { ok: false, error: "Invalid file path." }
    const { supabase, user } = await actionContext()
    check(await supabase.from("workspace_files").insert({ workspace_id: workspaceId, uploaded_by: user.id, name: file.name.slice(0, 255), path: file.path, size: file.size, mime: file.mime }))
    rp(workspaceId)
    return { ok: true }
  })
}

export async function deleteFile(workspaceId: string, id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("workspace_files").delete().eq("id", id).select("path")
    if (!data?.length) return { ok: false, error: "Only the uploader or owner can delete this file." }
    await supabase.storage.from("workspace-files").remove([data[0].path])
    rp(workspaceId)
    return { ok: true }
  })
}
