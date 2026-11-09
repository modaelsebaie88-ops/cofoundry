import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { CalendarDays, Lock, MessageSquare, Shield, Users } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { CategoryIcon } from "@/components/shared/category-icon"
import { EmptyState, Panel, SectionTitle } from "@/components/shared/page-header"
import { LinkButton } from "@/components/shared/link-button"
import { UserAvatar } from "@/components/shared/user-avatar"
import { DemoBadge, Tag, VerifiedBadge } from "@/components/shared/badges"
import { PostCard, type PostData } from "@/components/communities/post-card"
import { PostComposer } from "@/components/communities/post-composer"
import { ChatThread, type ChatMessage } from "@/components/chat/chat-thread"
import { OpportunityRow, type OpportunityListItem } from "@/components/opportunities/opportunity-row"
import { OPPORTUNITY_LIST_SELECT } from "@/lib/queries/opportunities"
import { EVENT_TYPES } from "@/lib/constants"
import { POST_SELECT } from "@/lib/queries/communities"
import { JoinButton } from "../join-button"
import { RemoveMemberButton } from "./remove-member-button"
import { cn } from "@/lib/utils"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("communities").select("name").eq("slug", slug).maybeSingle()
  return { title: data?.name ?? "Community" }
}

const TABS = ["feed", "chat", "members", "events", "opportunities", "about"] as const
const FILTERS = [
  { key: "all", label: "All" },
  { key: "discussion", label: "Discussions" },
  { key: "question", label: "Q&A" },
  { key: "poll", label: "Polls" },
  { key: "announcement", label: "Announcements" },
]
export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string; filter?: string; q?: string }>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as (typeof TABS)[number]) : "feed"
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: c } = await supabase.from("communities").select("*, categories(id, name)").eq("slug", slug).maybeSingle()
  if (!c) notFound()

  const [{ data: membership }, { data: canModerate }, { data: mods }] = await Promise.all([
    supabase.from("community_members").select("role").eq("community_id", c.id).eq("profile_id", me.id).maybeSingle(),
    supabase.rpc("is_community_moderator", { cid: c.id }),
    supabase
      .from("community_members")
      .select("profiles!inner(id, full_name, avatar_url, headline)")
      .eq("community_id", c.id)
      .eq("role", "moderator"),
  ])
  const isMember = Boolean(membership)
  const isMod = Boolean(canModerate)

  const tabLink = (t: (typeof TABS)[number]) => (t === "feed" ? `/communities/${slug}` : `/communities/${slug}?tab=${t}`)

  let content: React.ReactNode = null

  if (tab === "feed") {
    const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "all"
    let q = supabase.from("community_posts").select(POST_SELECT).eq("community_id", c.id)
    if (filter !== "all") q = q.eq("type", filter)
    const { data: posts } = await q.order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(30)
    const ids = (posts ?? []).map((p) => p.id)
    const [{ data: myReactions }, { data: myVotes }] = await Promise.all([
      ids.length ? supabase.from("post_reactions").select("post_id").eq("profile_id", me.id).in("post_id", ids) : Promise.resolve({ data: [] as { post_id: string }[] }),
      ids.length ? supabase.from("poll_votes").select("post_id, option_id").eq("voter_id", me.id).in("post_id", ids) : Promise.resolve({ data: [] as { post_id: string; option_id: string }[] }),
    ])
    const reacted = new Set((myReactions ?? []).map((r) => r.post_id))
    const votes = new Map((myVotes ?? []).map((v) => [v.post_id, v.option_id]))
    content = (
      <div className="space-y-4">
        {isMember ? (
          <Panel className="p-4 sm:p-5">
            <PostComposer communityId={c.id} canAnnounce={isMod} />
          </Panel>
        ) : (
          <JoinPrompt communityId={c.id} slug={slug} text="Join this community to post, reply, vote and chat." />
        )}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? `/communities/${slug}` : `/communities/${slug}?filter=${f.key}`}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                filter === f.key ? "border-primary/30 bg-accent text-accent-foreground" : "bg-white text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        {posts?.length ? (
          posts.map((p) => (
            <PostCard key={p.id} post={p as unknown as PostData} slug={slug} meId={me.id} canModerate={isMod} reacted={reacted.has(p.id)} myVote={votes.get(p.id) ?? null} />
          ))
        ) : (
          <EmptyState icon={MessageSquare} title="No posts here yet" description="Start the first conversation in this community." />
        )}
      </div>
    )
  } else if (tab === "chat") {
    if (!isMember && !isMod) {
      content = <JoinPrompt communityId={c.id} slug={slug} text="Community chat is for members. Join to read and send messages." icon />
    } else {
      const { data: msgs } = await supabase
        .from("community_messages")
        .select("id, sender_id, body, attachment_path, attachment_name, attachment_mime, created_at")
        .eq("community_id", c.id)
        .order("created_at", { ascending: false })
        .limit(40)
      const messages = ((msgs ?? []) as ChatMessage[]).reverse()
      const { data: chatEnabled } = await supabase.rpc("setting_enabled", { k: "community_chat_enabled" })
      const senderIds = [...new Set(messages.map((m) => m.sender_id))]
      const { data: senders } = senderIds.length ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", senderIds) : { data: [] }
      content = (
        <Panel className="flex h-[calc(100vh-15rem)] min-h-[28rem] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <p className="text-sm font-semibold"># {c.name}</p>
            <p className="text-xs text-muted-foreground">Real-time · visible to members only</p>
          </div>
          <ChatThread
            className="flex-1"
            source={{ table: "community_messages", column: "community_id", id: c.id, prefix: `community/${c.id}` }}
            me={{ id: me.id, full_name: me.full_name, avatar_url: me.avatar_url }}
            initialMessages={messages}
            initialProfiles={Object.fromEntries((senders ?? []).map((s) => [s.id, { full_name: s.full_name, avatar_url: s.avatar_url }]))}
            canPost={isMember && chatEnabled !== false}
            canModerate={isMod}
            disabledReason={chatEnabled === false ? "Community chat is temporarily disabled by the Cofoundry team." : "Join the community to send messages."}
            mentionCommunityId={c.id}
          />
        </Panel>
      )
    }
  } else if (tab === "members") {
    const search = (sp.q ?? "").trim().replace(/[%,()]/g, "")
    let mq = supabase
      .from("community_members")
      .select("role, joined_at, profiles!inner(id, full_name, avatar_url, headline, is_verified, is_demo)")
      .eq("community_id", c.id)
    if (search) mq = mq.ilike("profiles.full_name", `%${search}%`)
    const { data: members } = await mq.order("role", { ascending: false }).order("joined_at", { ascending: true }).limit(100)
    content = (
      <Panel>
        <form className="border-b p-4" action={`/communities/${slug}`}>
          <input type="hidden" name="tab" value="members" />
          <input name="q" defaultValue={search} placeholder="Search members" className="h-9 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:border-ring sm:w-72" />
        </form>
        <ul className="divide-y">
          {(members ?? []).map((m) => (
            <li key={m.profiles.id} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar name={m.profiles.full_name} src={m.profiles.avatar_url} size="sm" />
              <Link href={`/founders/${m.profiles.id}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {m.profiles.full_name} {m.profiles.is_verified && <VerifiedBadge />} {m.profiles.is_demo && <DemoBadge />}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.profiles.headline}</p>
              </Link>
              {m.role === "moderator" && (
                <Tag tone="primary">
                  <Shield className="mr-1 size-3" /> Moderator
                </Tag>
              )}
              {isMod && m.role !== "moderator" && m.profiles.id !== me.id && <RemoveMemberButton communityId={c.id} profileId={m.profiles.id} name={m.profiles.full_name} />}
            </li>
          ))}
          {!members?.length && <li className="p-8 text-center text-sm text-muted-foreground">No members found.</li>}
        </ul>
      </Panel>
    )
  } else if (tab === "events") {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, type, starts_at, is_online, location, registration_count")
      .eq("community_id", c.id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
    content = (
      <div className="space-y-3">
        {isMember && (
          <div className="flex justify-end">
            <LinkButton href={`/events/new?community=${c.id}`} size="sm">
              <CalendarDays /> Host an event
            </LinkButton>
          </div>
        )}
        {events?.length ? (
          <Panel className="divide-y">
            {events.map((e) => (
              <Link key={e.id} href={`/events/${e.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border bg-white leading-none">
                  <span className="text-[10px] font-semibold text-primary uppercase">{format(new Date(e.starts_at), "MMM")}</span>
                  <span className="text-lg font-semibold">{format(new Date(e.starts_at), "d")}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {EVENT_TYPES[e.type]} · {format(new Date(e.starts_at), "EEE p")} · {e.is_online ? "Online" : e.location} · {e.registration_count} going
                  </span>
                </span>
              </Link>
            ))}
          </Panel>
        ) : (
          <EmptyState icon={CalendarDays} title="No upcoming community events" description="Host a meetup, workshop or AMA for this community." />
        )}
      </div>
    )
  } else if (tab === "opportunities") {
    const { data: opps } = c.category_id
      ? await supabase.from("opportunities").select(OPPORTUNITY_LIST_SELECT).eq("status", "open").eq("category_id", c.category_id).order("created_at", { ascending: false }).limit(20)
      : { data: [] }
    content = opps?.length ? (
      <Panel className="divide-y">
        {opps.map((o) => (
          <OpportunityRow key={o.id} opportunity={o as unknown as OpportunityListItem} />
        ))}
      </Panel>
    ) : (
      <EmptyState icon={MessageSquare} title="No open opportunities in this industry" action={<LinkButton href="/opportunities/new">Post an opportunity</LinkButton>} />
    )
  } else {
    content = (
      <Panel className="space-y-6 p-6">
        <div>
          <SectionTitle>About</SectionTitle>
          <p className="text-sm text-foreground/85">{c.description}</p>
        </div>
        {c.rules && (
          <div>
            <SectionTitle>Community guidelines</SectionTitle>
            <p className="text-sm whitespace-pre-line text-foreground/85">{c.rules}</p>
          </div>
        )}
        <div>
          <SectionTitle>Moderators</SectionTitle>
          {mods?.length ? (
            <ul className="space-y-2">
              {mods.map((m) => (
                <li key={m.profiles.id}>
                  <Link href={`/founders/${m.profiles.id}`} className="flex items-center gap-2 text-sm hover:underline">
                    <UserAvatar name={m.profiles.full_name} src={m.profiles.avatar_url} size="xs" /> {m.profiles.full_name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Moderated by the Cofoundry team.</p>
          )}
        </div>
      </Panel>
    )
  }

  // Featured founders: most active contributors in this community
  const { data: recent } = await supabase
    .from("community_posts")
    .select("author_id, comment_count, reaction_count")
    .eq("community_id", c.id)
    .order("created_at", { ascending: false })
    .limit(200)
  const scores = new Map<string, number>()
  for (const p of recent ?? []) scores.set(p.author_id, (scores.get(p.author_id) ?? 0) + 3 + p.comment_count + p.reaction_count)
  const topIds = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id)
  const { data: featured } = topIds.length ? await supabase.from("profiles").select("id, full_name, avatar_url, headline").in("id", topIds) : { data: [] }
  const { data: announcements } = await supabase
    .from("community_posts")
    .select("id, title, created_at")
    .eq("community_id", c.id)
    .eq("type", "announcement")
    .order("created_at", { ascending: false })
    .limit(3)

  return (
    <div>
      <Panel className="mb-6 overflow-hidden">
        <div className="bg-soft-gradient p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <CategoryIcon name={c.icon} size="lg" seed={c.category_id ?? 0} />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
                <p className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" /> {c.member_count.toLocaleString()} members
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-3.5" /> {c.post_count.toLocaleString()} posts
                  </span>
                  {isMod && (
                    <span className="flex items-center gap-1 text-primary">
                      <Shield className="size-3.5" /> You moderate
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-44">
              <JoinButton communityId={c.id} slug={slug} joined={isMember} size="default" />
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm text-foreground/80">{c.description}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t px-3" aria-label="Community sections">
          {TABS.map((t) => (
            <Link
              key={t}
              href={tabLink(t)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-medium capitalize",
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </Link>
          ))}
        </nav>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">{content}</div>
        <aside className="space-y-6">
          {announcements && announcements.length > 0 && (
            <Panel className="p-5">
              <SectionTitle>Announcements</SectionTitle>
              <ul className="space-y-2">
                {announcements.map((a) => (
                  <li key={a.id}>
                    <Link href={`/communities/${slug}/posts/${a.id}`} className="line-clamp-2 text-sm hover:text-primary">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel className="p-5">
            <SectionTitle>Featured founders</SectionTitle>
            {featured?.length ? (
              <ul className="space-y-3">
                {topIds
                  .map((id) => featured.find((f) => f.id === id))
                  .filter(Boolean)
                  .map((f) => (
                    <li key={f!.id}>
                      <Link href={`/founders/${f!.id}`} className="flex items-center gap-2.5">
                        <UserAvatar name={f!.full_name} src={f!.avatar_url} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{f!.full_name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{f!.headline}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">The most active contributors will appear here.</p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function JoinPrompt({ communityId, slug, text, icon }: { communityId: string; slug: string; text: string; icon?: boolean }) {
  return (
    <Panel className="flex flex-col items-center gap-3 p-8 text-center">
      {icon && <Lock className="size-6 text-primary" />}
      <p className="text-sm text-muted-foreground">{text}</p>
      <div className="w-48">
        <JoinButton communityId={communityId} slug={slug} joined={false} />
      </div>
    </Panel>
  )
}
