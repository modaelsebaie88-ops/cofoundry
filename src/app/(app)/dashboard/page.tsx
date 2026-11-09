import type { Metadata } from "next"
import Link from "next/link"
import { format } from "date-fns"
import {
  ArrowRight,
  Bookmark,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Circle,
  Flame,
  MessageCircle,
  MessagesSquare,
  PenSquare,
  Search,
  Sparkles,
  ThumbsUp,
  Users,
} from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { profileCompleteness } from "@/lib/insights"
import { getConnectionMap, connectionStateFor, getSavedSet } from "@/lib/queries/network"
import { getRecommendations } from "@/lib/queries/recommendations"
import { suggestOpportunities } from "@/lib/queries/opportunities"
import { MatchCard } from "@/components/network/match-card"
import { NotificationIcon } from "@/components/notifications/notification-icon"
import { OpportunityRow } from "@/components/opportunities/opportunity-row"
import { EmptyState, Panel, SectionTitle } from "@/components/shared/page-header"
import { LinkButton } from "@/components/shared/link-button"
import { RelativeTime } from "@/components/shared/relative-time"
import { StartupLogo, UserAvatar } from "@/components/shared/user-avatar"
import { StageBadge } from "@/components/shared/badges"
import { Progress } from "@/components/ui/progress"
import { EVENT_TYPES, type Capability } from "@/lib/constants"
import { stripMentions, truncate } from "@/lib/utils"

export const metadata: Metadata = { title: "Dashboard" }

const daysAgoIso = (days: number) => new Date(Date.now() - days * 86400e3).toISOString()

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()

  const [
    { data: startup },
    { data: mySkills },
    { data: myInterests },
    { data: memberships },
    { data: conversations },
    { data: notifications },
    { data: savedOpps },
    { data: myRegs },
  ] = await Promise.all([
    supabase.from("startups").select("id, name, slug, stage, logo_url, description, tagline").eq("owner_id", me.id).maybeSingle(),
    supabase.from("profile_skills").select("kind, skills(name)").eq("profile_id", me.id),
    supabase.from("profile_interests").select("category_id").eq("profile_id", me.id),
    supabase.from("community_members").select("community_id").eq("profile_id", me.id),
    supabase.rpc("get_my_conversations"),
    supabase.from("notifications").select("id, type, title, link, is_read, created_at").eq("recipient_id", me.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("saved_items").select("item_id").eq("profile_id", me.id).eq("item_type", "opportunity").order("created_at", { ascending: false }).limit(4),
    supabase.from("event_registrations").select("event_id").eq("profile_id", me.id).eq("status", "registered"),
  ])

  const skills = (mySkills ?? []).filter((s) => s.kind === "has" && s.skills).map((s) => s.skills!.name)
  const interests = (myInterests ?? []).map((i) => i.category_id)
  const joinedIds = (memberships ?? []).map((m) => m.community_id)
  const registeredIds = new Set((myRegs ?? []).map((r) => r.event_id))

  const completeness = profileCompleteness({
    profile: me,
    hasStartup: Boolean(startup),
    startupHasLogo: Boolean(startup?.logo_url),
    startupHasDescription: Boolean(startup?.description),
    skillsCount: skills.length,
    interestsCount: interests.length,
  })

  const since = daysAgoIso(21)
  const [recommendations, connectionMap, savedFounders, opportunities, trending, events, suggestedCommunities, savedOppRows] = await Promise.all([
    getRecommendations(supabase, me.id, 4),
    getConnectionMap(supabase, me.id),
    getSavedSet(supabase, me.id, "founder"),
    suggestOpportunities(supabase, {
      id: me.id,
      offers: me.offers as Capability[],
      looking_for: me.looking_for as Capability[],
      seeking_cofounder: me.seeking_cofounder,
      open_to_partnerships: me.open_to_partnerships,
      skills,
      interests,
    }),
    joinedIds.length
      ? supabase
          .from("community_posts")
          .select("id, title, body, type, comment_count, reaction_count, created_at, communities(slug, name), author:profiles!community_posts_author_id_fkey(full_name, avatar_url)")
          .in("community_id", joinedIds)
          .gte("created_at", since)
          .order("comment_count", { ascending: false })
          .order("reaction_count", { ascending: false })
          .limit(5)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    supabase
      .from("events")
      .select("id, title, type, starts_at, is_online, registration_count")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(4)
      .then((r) => r.data ?? []),
    supabase
      .from("communities")
      .select("id, slug, name, icon, member_count, category_id")
      .not("id", "in", `(${joinedIds.length ? joinedIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
      .order("member_count", { ascending: false })
      .limit(20)
      .then((r) =>
        (r.data ?? [])
          .sort((a, b) => Number(interests.includes(b.category_id ?? -1)) - Number(interests.includes(a.category_id ?? -1)))
          .slice(0, 3)
      ),
    savedOpps?.length
      ? supabase.from("opportunities").select("id, title, type, status").in("id", savedOpps.map((s) => s.item_id)).then((r) => r.data ?? [])
      : Promise.resolve([]),
  ])

  const firstName = me.full_name.split(" ")[0] || "there"
  const recentConversations = (conversations ?? []).slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl border bg-soft-gradient p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">{welcome ? "Welcome to Cofoundry 🎉" : format(new Date(), "EEEE, MMMM d")}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {welcome ? `Great to have you, ${firstName}.` : `Good to see you, ${firstName}.`}
            </h1>
            {startup ? (
              <Link href={`/startups/${startup.slug}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 py-1 pr-3 pl-1 text-sm shadow-sm hover:bg-white">
                <StartupLogo name={startup.name} src={startup.logo_url} size="sm" className="size-7 rounded-full" />
                <span className="font-medium">{startup.name}</span>
                <StageBadge stage={startup.stage} />
              </Link>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Exploring ideas?{" "}
                <Link href="/startup" className="font-medium text-primary hover:underline">
                  Add your startup
                </Link>{" "}
                when you&apos;re ready.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <LinkButton href="/discover" size="lg">
              <Search /> Find collaborators
            </LinkButton>
            <LinkButton href="/communities?compose=1" size="lg" variant="outline" className="bg-white">
              <PenSquare /> Publish a post
            </LinkButton>
            <LinkButton href="/opportunities/new" size="lg" variant="outline" className="bg-white">
              <Briefcase /> Post opportunity
            </LinkButton>
            <LinkButton href="/assistant" size="lg" variant="outline" className="bg-white">
              <Bot /> Ask AI
            </LinkButton>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* Recommendations */}
          <section>
            <SectionTitle
              action={
                <Link href="/discover?tab=recommended" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  All recommendations <ArrowRight className="size-3" />
                </Link>
              }
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" /> Recommended founders for you
              </span>
            </SectionTitle>
            {recommendations.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {recommendations.map((r) => (
                  <MatchCard
                    key={r.founder.id}
                    founder={r.founder}
                    score={r.score}
                    reasons={r.reasons}
                    connection={connectionStateFor(connectionMap, r.founder.id)}
                    saved={savedFounders.has(r.founder.id)}
                    compact
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No recommendations yet"
                description="Tell us what you're looking for and what you can offer — matches are calculated from your profile."
                action={<LinkButton href="/settings/profile#collaboration">Update preferences</LinkButton>}
              />
            )}
          </section>

          {/* Trending */}
          <section>
            <SectionTitle
              action={
                <Link href="/communities" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Communities <ArrowRight className="size-3" />
                </Link>
              }
            >
              <span className="flex items-center gap-1.5">
                <Flame className="size-4 text-orange-500" /> Trending in your communities
              </span>
            </SectionTitle>
            <Panel className="divide-y">
              {trending.length ? (
                trending.map((p) => (
                  <Link key={p.id} href={`/communities/${p.communities?.slug}/posts/${p.id}`} className="flex gap-3 p-4 transition hover:bg-muted/40">
                    <UserAvatar name={p.author?.full_name} src={p.author?.avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-medium">{p.title}</p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">{truncate(stripMentions(p.body), 140)}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-primary/90">{p.communities?.name}</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="size-3" /> {p.comment_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="size-3" /> {p.reaction_count}
                        </span>
                        <RelativeTime date={p.created_at} />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No recent discussions in your communities.{" "}
                  <Link href="/communities" className="font-medium text-primary hover:underline">
                    Join a community
                  </Link>{" "}
                  or start one.
                </p>
              )}
            </Panel>
          </section>

          {/* Opportunities */}
          <section>
            <SectionTitle
              action={
                <Link href="/opportunities" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Marketplace <ArrowRight className="size-3" />
                </Link>
              }
            >
              <span className="flex items-center gap-1.5">
                <Briefcase className="size-4 text-primary" /> Collaboration opportunities for you
              </span>
            </SectionTitle>
            {opportunities.length ? (
              <Panel className="divide-y">
                {opportunities.map((o) => (
                  <OpportunityRow key={o.id} opportunity={o} reason={o.reason} />
                ))}
              </Panel>
            ) : (
              <EmptyState icon={Briefcase} title="No matching opportunities right now" description="Browse the marketplace or publish what you're looking for." action={<LinkButton href="/opportunities">Browse opportunities</LinkButton>} />
            )}
          </section>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Profile strength</p>
              <span className="text-sm font-semibold text-primary">{completeness.score}%</span>
            </div>
            <Progress value={completeness.score} className="mt-3" />
            {completeness.missing.length ? (
              <ul className="mt-4 space-y-2">
                {completeness.missing.slice(0, 4).map((m) => (
                  <li key={m.label}>
                    <Link href={m.href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <Circle className="size-3.5 text-primary/50" /> {m.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" /> Your profile is complete — great matches ahead.
              </p>
            )}
          </Panel>

          <Panel className="p-5">
            <SectionTitle action={<Link href="/messages" className="text-xs font-medium text-primary hover:underline">Open inbox</Link>}>
              <span className="flex items-center gap-1.5">
                <MessagesSquare className="size-4 text-primary" /> Recent messages
              </span>
            </SectionTitle>
            {recentConversations.length ? (
              <ul className="-mx-2 space-y-0.5">
                {recentConversations.map((c) => {
                  const other = (c.participants as { full_name: string; avatar_url: string | null }[])[0]
                  return (
                    <li key={c.id}>
                      <Link href={`/messages/${c.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
                        <UserAvatar name={c.is_group ? c.title : other?.full_name} src={c.is_group ? null : other?.avatar_url} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.is_group ? c.title : other?.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.last_message_preview ?? "No messages yet"}</p>
                        </div>
                        {Number(c.unread_count) > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">{c.unread_count}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No conversations yet. Connect with a founder to start one.</p>
            )}
          </Panel>

          <Panel className="p-5">
            <SectionTitle action={<Link href="/notifications" className="text-xs font-medium text-primary hover:underline">View all</Link>}>Notifications</SectionTitle>
            {notifications?.length ? (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link href={n.link ?? "/notifications"} className="flex gap-3">
                      <NotificationIcon type={n.type} className="size-7" />
                      <div className="min-w-0">
                        <p className={`line-clamp-2 text-sm leading-snug ${n.is_read ? "text-muted-foreground" : "font-medium"}`}>{n.title}</p>
                        <RelativeTime date={n.created_at} className="text-[11px] text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing new.</p>
            )}
          </Panel>

          <Panel className="p-5">
            <SectionTitle action={<Link href="/events" className="text-xs font-medium text-primary hover:underline">All events</Link>}>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4 text-primary" /> Upcoming events
              </span>
            </SectionTitle>
            {events.length ? (
              <ul className="space-y-3">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} className="flex gap-3">
                      <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border bg-white text-center leading-none">
                        <span className="text-[10px] font-semibold text-primary uppercase">{format(new Date(e.starts_at), "MMM")}</span>
                        <span className="text-base font-semibold">{format(new Date(e.starts_at), "d")}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-1 text-sm font-medium">{e.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {EVENT_TYPES[e.type]} · {e.is_online ? "Online" : "In person"}
                          {registeredIds.has(e.id) && <span className="ml-1 font-medium text-emerald-600">· Registered</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            )}
          </Panel>

          {suggestedCommunities.length > 0 && (
            <Panel className="p-5">
              <SectionTitle>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 text-primary" /> Communities to join
                </span>
              </SectionTitle>
              <ul className="space-y-2">
                {suggestedCommunities.map((c) => (
                  <li key={c.id}>
                    <Link href={`/communities/${c.slug}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/60">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.member_count} members</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel className="p-5">
            <SectionTitle action={<Link href="/saved" className="text-xs font-medium text-primary hover:underline">All saved</Link>}>
              <span className="flex items-center gap-1.5">
                <Bookmark className="size-4 text-primary" /> Saved opportunities
              </span>
            </SectionTitle>
            {savedOppRows.length ? (
              <ul className="space-y-2">
                {savedOppRows.map((o) => (
                  <li key={o.id}>
                    <Link href={`/opportunities/${o.id}`} className="line-clamp-1 text-sm hover:text-primary">
                      {o.title}
                      {o.status === "closed" && <span className="ml-1 text-xs text-muted-foreground">(closed)</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Bookmark opportunities to keep track of them here.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
