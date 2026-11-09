import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { POST_SELECT } from "@/lib/queries/communities"
import { PostCard, type PostData } from "@/components/communities/post-card"
import { CommentThread } from "./comment-thread"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("community_posts").select("title").eq("id", id).maybeSingle()
  return { title: data?.title ?? "Post" }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: post } = await supabase.from("community_posts").select(`${POST_SELECT}, communities(id, slug, name)`).eq("id", id).maybeSingle()
  if (!post || post.communities?.slug !== slug) notFound()

  const [{ data: comments }, { data: reaction }, { data: vote }, { data: membership }, { data: canModerate }] = await Promise.all([
    supabase
      .from("comments")
      .select("id, body, created_at, author:profiles!comments_author_id_fkey(id, full_name, avatar_url, headline, is_verified)")
      .eq("post_id", id)
      .order("created_at"),
    supabase.from("post_reactions").select("post_id").eq("post_id", id).eq("profile_id", me.id).maybeSingle(),
    supabase.from("poll_votes").select("option_id").eq("post_id", id).eq("voter_id", me.id).maybeSingle(),
    supabase.from("community_members").select("role").eq("community_id", post.community_id).eq("profile_id", me.id).maybeSingle(),
    supabase.rpc("is_community_moderator", { cid: post.community_id }),
  ])

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/communities/${slug}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {post.communities?.name}
      </Link>
      <PostCard
        post={post as unknown as PostData}
        slug={slug}
        meId={me.id}
        canModerate={Boolean(canModerate)}
        reacted={Boolean(reaction)}
        myVote={vote?.option_id ?? null}
        full
      />
      <CommentThread
        postId={id}
        postType={post.type}
        acceptedId={post.accepted_comment_id}
        canAccept={post.author?.id === me.id || Boolean(canModerate)}
        canModerate={Boolean(canModerate)}
        isMember={Boolean(membership)}
        communityId={post.community_id}
        slug={slug}
        meId={me.id}
        comments={(comments ?? []) as never}
      />
    </div>
  )
}
