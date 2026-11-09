import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Briefcase, Clock, Globe, GraduationCap, Link2, MapPin, Pencil, Sparkles, Star } from "lucide-react"
import { getCurrentProfile, requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { matchWith } from "@/lib/matching/service"
import { connectionStateFor, getConnectionMap, getSavedSet } from "@/lib/queries/network"
import { computeBadges, type ReputationStats } from "@/lib/reputation"
import { AVAILABILITY, CAPABILITIES, COLLAB_TYPES, ROLES, type Capability } from "@/lib/constants"
import { ConnectButton, MessageButton } from "@/components/network/connect-button"
import { FactorBreakdown, ScoreRing } from "@/components/network/match-card"
import { DemoBadge, StageBadge, Tag, VerifiedBadge } from "@/components/shared/badges"
import { LinkButton } from "@/components/shared/link-button"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { ReportButton } from "@/components/shared/report-dialog"
import { SaveButton } from "@/components/shared/save-button"
import { StartupLogo, UserAvatar } from "@/components/shared/user-avatar"
import { EndorseDialog } from "./endorse-dialog"
import { cn } from "@/lib/utils"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle()
  return { title: data?.full_name ?? "Founder" }
}

const tierClass = { bronze: "bg-amber-50 text-amber-800 border-amber-200", silver: "bg-slate-50 text-slate-700 border-slate-200", gold: "bg-yellow-50 text-yellow-800 border-yellow-300" }

export default async function FounderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle()
  if (!p) notFound()
  const isSelf = me.id === p.id

  const [
    { data: skills },
    { data: interests },
    { data: startup },
    { data: reputation },
    { data: endorsements },
    { data: communities },
    { data: opportunities },
    { data: mentor },
    connectionMap,
    saved,
    match,
  ] = await Promise.all([
    supabase.from("profile_skills").select("kind, skills(name)").eq("profile_id", id),
    supabase.from("profile_interests").select("categories(id, name)").eq("profile_id", id),
    supabase.from("startups").select("name, slug, tagline, stage, logo_url, is_verified, categories(name)").eq("owner_id", id).maybeSingle(),
    supabase.rpc("get_reputation", { pid: id }),
    supabase
      .from("endorsements")
      .select("id, body, skill, created_at, endorser:profiles!endorsements_endorser_id_fkey(id, full_name, avatar_url, headline)")
      .eq("endorsee_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("community_members").select("role, communities(slug, name)").eq("profile_id", id).limit(12),
    supabase.from("opportunities").select("id, title, type, created_at").eq("author_id", id).eq("status", "open").order("created_at", { ascending: false }).limit(5),
    supabase.from("mentor_profiles").select("profile_id, rating_avg, review_count, is_accepting").eq("profile_id", id).maybeSingle(),
    getConnectionMap(supabase, me.id),
    getSavedSet(supabase, me.id, "founder"),
    isSelf ? Promise.resolve(null) : matchWith(supabase, me.id, id),
  ])

  const connection = connectionStateFor(connectionMap, id)
  const has = (skills ?? []).filter((s) => s.kind === "has" && s.skills).map((s) => s.skills!.name)
  const learning = (skills ?? []).filter((s) => s.kind === "learn" && s.skills).map((s) => s.skills!.name)
  const badges = reputation ? computeBadges(reputation as unknown as ReputationStats) : []
  const stats = reputation as unknown as ReputationStats | null
  const alreadyEndorsed = (endorsements ?? []).some((e) => e.endorser?.id === me.id)
  const location = [p.city, p.country].filter(Boolean).join(", ")
  const viewer = await getCurrentProfile()

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <Panel className="overflow-hidden">
          <div className="h-24 bg-brand-gradient sm:h-28" />
          <div className="px-5 pb-5 sm:px-6">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <UserAvatar name={p.full_name} src={p.avatar_url} size="xl" className="rounded-full ring-4 ring-white" />
              <div className="flex flex-wrap gap-2">
                {isSelf ? (
                  <LinkButton href="/settings/profile" variant="outline">
                    <Pencil /> Edit profile
                  </LinkButton>
                ) : (
                  <>
                    <ConnectButton targetId={p.id} targetName={p.full_name} state={connection} size="default" />
                    <MessageButton targetId={p.id} size="default" />
                    <SaveButton itemType="founder" itemId={p.id} saved={saved.has(p.id)} withLabel size="default" />
                    <ReportButton targetType="profile" targetId={p.id} snapshot={`${p.full_name}: ${p.headline ?? ""}`} />
                  </>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{p.full_name}</h1>
                {p.is_verified && <VerifiedBadge />}
                {p.is_demo && <DemoBadge />}
                {p.role !== "founder" && <Tag tone="primary">{ROLES[p.role]}</Tag>}
              </div>
              <p className="mt-1 text-muted-foreground">{p.headline}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {location}
                  </span>
                )}
                {p.founder_role && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="size-3.5" /> {p.founder_role}
                    {p.years_experience != null && ` · ${p.years_experience} yrs experience`}
                  </span>
                )}
                {p.availability && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {AVAILABILITY[p.availability]}
                  </span>
                )}
                {p.linkedin_url && (
                  <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-primary hover:underline">
                    <Link2 className="size-3.5" /> LinkedIn
                  </a>
                )}
                {p.website_url && (
                  <a href={p.website_url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-primary hover:underline">
                    <Globe className="size-3.5" /> Website
                  </a>
                )}
              </div>
              {(p.seeking_cofounder || p.open_to_partnerships) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.seeking_cofounder && <Tag tone="success">Looking for a co-founder</Tag>}
                  {p.open_to_partnerships && <Tag tone="success">Open to partnerships</Tag>}
                </div>
              )}
            </div>
          </div>
        </Panel>

        {match && (
          <Panel className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <ScoreRing score={match.score} size={64} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" /> Why you two might work well together
                </p>
                <p className="mt-1 text-sm text-foreground/85">{match.summary}</p>
                <p className="mt-2 text-sm font-medium text-primary">{match.suggestion}</p>
              </div>
            </div>
            <details className="group mt-4 rounded-xl border p-4">
              <summary className="cursor-pointer text-sm font-medium">Score breakdown</summary>
              <div className="mt-4">
                <FactorBreakdown factors={match.factors} />
              </div>
            </details>
          </Panel>
        )}

        {(p.bio || p.previous_experience) && (
          <Panel className="p-5 sm:p-6">
            <SectionTitle>About</SectionTitle>
            {p.bio && <p className="text-sm leading-relaxed whitespace-pre-line">{p.bio}</p>}
            {p.previous_experience && p.previous_experience !== p.bio && (
              <>
                <h3 className="mt-5 mb-1 text-sm font-semibold">Previous experience</h3>
                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/85">{p.previous_experience}</p>
              </>
            )}
          </Panel>
        )}

        <Panel className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <SectionTitle>Looking for</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {p.looking_for.length ? p.looking_for.map((c: Capability) => <Tag key={c} tone="primary">{CAPABILITIES[c].label}</Tag>) : <span className="text-sm text-muted-foreground">Not specified</span>}
            </div>
          </div>
          <div>
            <SectionTitle>Can offer</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {p.offers.length ? p.offers.map((c: Capability) => <Tag key={c} tone="success">{CAPABILITIES[c].label}</Tag>) : <span className="text-sm text-muted-foreground">Not specified</span>}
            </div>
          </div>
          <div>
            <SectionTitle>Skills</SectionTitle>
            <div className="flex flex-wrap gap-1.5">{has.length ? has.map((s) => <Tag key={s}>{s}</Tag>) : <span className="text-sm text-muted-foreground">None listed</span>}</div>
          </div>
          <div>
            <SectionTitle>Wants to learn</SectionTitle>
            <div className="flex flex-wrap gap-1.5">{learning.length ? learning.map((s) => <Tag key={s}>{s}</Tag>) : <span className="text-sm text-muted-foreground">None listed</span>}</div>
          </div>
          <div>
            <SectionTitle>Industries of interest</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {(interests ?? []).map((i) => i.categories && <Tag key={i.categories.id}>{i.categories.name}</Tag>)}
            </div>
          </div>
          <div>
            <SectionTitle>Collaboration preferences</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {p.collaboration_types.length ? p.collaboration_types.map((c) => <Tag key={c}>{COLLAB_TYPES[c]}</Tag>) : <span className="text-sm text-muted-foreground">Not specified</span>}
            </div>
          </div>
          {p.help_topics.length > 0 && (
            <div className="sm:col-span-2">
              <SectionTitle>Can help with</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {p.help_topics.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel className="p-5 sm:p-6">
          <SectionTitle
            action={
              !isSelf && connection.status === "connected" && !alreadyEndorsed ? (
                <EndorseDialog endorseeId={p.id} endorseeName={p.full_name} skills={has} />
              ) : undefined
            }
          >
            Recommendations from founders ({endorsements?.length ?? 0})
          </SectionTitle>
          {endorsements?.length ? (
            <ul className="space-y-4">
              {endorsements.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <UserAvatar name={e.endorser?.full_name} src={e.endorser?.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm">
                      <Link href={`/founders/${e.endorser?.id}`} className="font-medium hover:underline">
                        {e.endorser?.full_name}
                      </Link>
                      {e.skill && <span className="text-muted-foreground"> · recommends for {e.skill}</span>}
                    </p>
                    <p className="mt-1 text-sm text-foreground/85">&ldquo;{e.body}&rdquo;</p>
                    <p className="mt-1 text-xs text-muted-foreground">{format(new Date(e.created_at), "MMM d, yyyy")}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {!isSelf && connection.status !== "connected"
                ? "Connect with this founder to be able to write a recommendation."
                : "No recommendations yet."}
            </p>
          )}
        </Panel>
      </div>

      <aside className="space-y-6">
        {startup && (
          <Panel className="p-5">
            <SectionTitle>Startup</SectionTitle>
            <Link href={`/startups/${startup.slug}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-muted/50">
              <StartupLogo name={startup.name} src={startup.logo_url} size="lg" />
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-semibold">
                  {startup.name} {startup.is_verified && <VerifiedBadge label="Verified startup" />}
                </p>
                <p className="truncate text-xs text-muted-foreground">{startup.categories?.name}</p>
                <div className="mt-1">
                  <StageBadge stage={startup.stage} />
                </div>
              </div>
            </Link>
            {startup.tagline && <p className="mt-3 text-sm text-muted-foreground">{startup.tagline}</p>}
          </Panel>
        )}

        {mentor && (
          <Panel className="p-5">
            <SectionTitle>Mentor</SectionTitle>
            <p className="flex items-center gap-1.5 text-sm">
              <GraduationCap className="size-4 text-primary" /> Offers mentorship sessions
            </p>
            {mentor.review_count > 0 && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="size-3.5 fill-amber-400 text-amber-400" /> {Number(mentor.rating_avg).toFixed(1)} · {mentor.review_count} reviews
              </p>
            )}
            <LinkButton href={`/mentorship/${p.id}`} variant="outline" size="sm" className="mt-3 w-full">
              {isSelf ? "View mentor profile" : mentor.is_accepting ? "Request a session" : "View mentor profile"}
            </LinkButton>
          </Panel>
        )}

        <Panel className="p-5">
          <SectionTitle>Reputation</SectionTitle>
          {stats && (
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Posts", stats.posts + stats.comments],
                ["Connections", stats.connections],
                ["Collabs", stats.workspaces + stats.accepted_applications],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted/50 p-2">
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {badges.length ? (
            <ul className="mt-4 space-y-2">
              {badges.map((b) => (
                <li key={b.key} className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2", tierClass[b.tier])}>
                  <b.icon className="size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{b.label}</span>
                    <span className="block text-[11px] opacity-80">{b.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Badges are earned through community contributions and collaborations.</p>
          )}
          {!p.is_verified && isSelf && (
            <Link href="/settings/verification" className="mt-4 block text-xs font-medium text-primary hover:underline">
              Request founder verification →
            </Link>
          )}
        </Panel>

        {communities && communities.length > 0 && (
          <Panel className="p-5">
            <SectionTitle>Communities</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {communities.map(
                (c) =>
                  c.communities && (
                    <Link key={c.communities.slug} href={`/communities/${c.communities.slug}`}>
                      <Tag className="hover:bg-accent">
                        {c.communities.name}
                        {c.role === "moderator" && " · Mod"}
                      </Tag>
                    </Link>
                  )
              )}
            </div>
          </Panel>
        )}

        {opportunities && opportunities.length > 0 && (
          <Panel className="p-5">
            <SectionTitle>Open opportunities</SectionTitle>
            <ul className="space-y-2">
              {opportunities.map((o) => (
                <li key={o.id}>
                  <Link href={`/opportunities/${o.id}`} className="line-clamp-2 text-sm hover:text-primary">
                    {o.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {viewer?.role === "admin" && !isSelf && (
          <LinkButton href={`/admin/users?q=${encodeURIComponent(p.full_name)}`} variant="ghost" size="sm" className="w-full">
            Manage in admin
          </LinkButton>
        )}
      </aside>
    </div>
  )
}
