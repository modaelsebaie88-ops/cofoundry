"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { actionContext, check, runAction, type ActionResult } from "@/lib/auth"

export async function joinCommunity(communityId: string, slug: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    check(await supabase.from("community_members").upsert({ community_id: communityId, profile_id: user.id }, { ignoreDuplicates: true, onConflict: "community_id,profile_id" }))
    revalidatePath(`/communities/${slug}`)
    revalidatePath("/communities")
    return { ok: true, message: "Joined community" }
  })
}

export async function leaveCommunity(communityId: string, slug: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    check(await supabase.from("community_members").delete().eq("community_id", communityId).eq("profile_id", user.id))
    revalidatePath(`/communities/${slug}`)
    revalidatePath("/communities")
    return { ok: true, message: "You left the community" }
  })
}

const postSchema = z
  .object({
    community_id: z.string().uuid(),
    type: z.enum(["discussion", "question", "announcement", "poll"]),
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
    body: z.string().trim().max(10000).default(""),
    poll_options: z.array(z.string().trim().min(1).max(120)).max(6).default([]),
  })
  .refine((v) => v.type !== "poll" || v.poll_options.length >= 2, { message: "Polls need at least two options", path: ["poll_options"] })

export async function createPost(input: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  return runAction(async () => {
    const parsed = postSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid post" }
    const { supabase, user } = await actionContext()
    const { poll_options, ...post } = parsed.data
    const { data: community } = await supabase.from("communities").select("slug").eq("id", post.community_id).single()
    const { data, error } = await supabase.from("community_posts").insert({ ...post, author_id: user.id }).select("id").single()
    if (error) {
      if (/row-level/.test(error.message)) return { ok: false, error: "Join this community to post." }
      if (/moderators/.test(error.message)) return { ok: false, error: "Only moderators can publish announcements." }
      throw new Error(error.message)
    }
    if (post.type === "poll") {
      check(await supabase.from("poll_options").insert(poll_options.map((label, position) => ({ post_id: data.id, label, position }))))
    }
    revalidatePath(`/communities/${community?.slug}`)
    return { ok: true, data: { id: data.id, slug: community?.slug ?? "" } }
  })
}

export async function updatePost(postId: string, input: { title: string; body: string }): Promise<ActionResult> {
  return runAction(async () => {
    const title = input.title.trim()
    if (title.length < 3 || title.length > 200) return { ok: false, error: "Title must be 3–200 characters." }
    const { supabase, user } = await actionContext()
    check(await supabase.from("community_posts").update({ title, body: input.body.trim().slice(0, 10000) }).eq("id", postId).eq("author_id", user.id))
    revalidatePath("/communities", "layout")
    return { ok: true, message: "Post updated" }
  })
}

export async function deletePost(postId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data, error } = await supabase.from("community_posts").delete().eq("id", postId).select("id")
    if (error) throw new Error(error.message)
    if (!data?.length) return { ok: false, error: "You can't delete this post." }
    revalidatePath("/communities", "layout")
    return { ok: true, message: "Post deleted" }
  })
}

export async function setPinned(postId: string, pinned: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { error } = await supabase.from("community_posts").update({ is_pinned: pinned }).eq("id", postId)
    if (error) return { ok: false, error: /moderators/.test(error.message) ? "Only moderators can pin posts." : error.message }
    revalidatePath("/communities", "layout")
    return { ok: true, message: pinned ? "Post pinned" : "Post unpinned" }
  })
}

export async function toggleReaction(postId: string, react: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    if (react) check(await supabase.from("post_reactions").upsert({ post_id: postId, profile_id: user.id }, { ignoreDuplicates: true }))
    else check(await supabase.from("post_reactions").delete().eq("post_id", postId).eq("profile_id", user.id))
    return { ok: true }
  })
}

export async function votePoll(postId: string, optionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase, user } = await actionContext()
    await supabase.from("poll_votes").delete().eq("post_id", postId).eq("voter_id", user.id)
    const { error } = await supabase.from("poll_votes").insert({ post_id: postId, option_id: optionId, voter_id: user.id })
    if (error) return { ok: false, error: /row-level/.test(error.message) ? "Join this community to vote." : error.message }
    revalidatePath("/communities", "layout")
    return { ok: true }
  })
}

export async function addComment(postId: string, body: string): Promise<ActionResult> {
  return runAction(async () => {
    const text = body.trim()
    if (!text) return { ok: false, error: "Write something first." }
    if (text.length > 5000) return { ok: false, error: "Comments are limited to 5,000 characters." }
    const { supabase, user } = await actionContext()
    const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body: text })
    if (error) return { ok: false, error: /row-level/.test(error.message) ? "Join this community to reply." : error.message }
    revalidatePath("/communities", "layout")
    return { ok: true }
  })
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("comments").delete().eq("id", commentId).select("id")
    if (!data?.length) return { ok: false, error: "You can't delete this reply." }
    revalidatePath("/communities", "layout")
    return { ok: true, message: "Reply deleted" }
  })
}

export async function acceptAnswer(postId: string, commentId: string | null): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("community_posts").update({ accepted_comment_id: commentId }).eq("id", postId).select("id")
    if (!data?.length) return { ok: false, error: "Only the author or a moderator can accept an answer." }
    revalidatePath("/communities", "layout")
    return { ok: true, message: commentId ? "Answer accepted" : "Answer unmarked" }
  })
}

export async function removeMember(communityId: string, profileId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actionContext()
    const { data } = await supabase.from("community_members").delete().eq("community_id", communityId).eq("profile_id", profileId).select("profile_id")
    if (!data?.length) return { ok: false, error: "Only moderators can remove members." }
    revalidatePath("/communities", "layout")
    return { ok: true, message: "Member removed" }
  })
}
