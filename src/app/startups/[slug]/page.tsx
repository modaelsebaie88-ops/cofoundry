import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Calendar, ExternalLink, Globe, Link2, MapPin, Target, Users, Wallet } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { CAPABILITIES, OPPORTUNITY_TYPES, type Capability } from "@/lib/constants"
import { Logo } from "@/components/shell/logo"
import { StageBadge, Tag, VerifiedBadge } from "@/components/shared/badges"
import { LinkButton } from "@/components/shared/link-button"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { RichText } from "@/components/shared/rich-text"
import { StartupLogo, UserAvatar } from "@/components/shared/user-avatar"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("startups").select("name, tagline").eq("slug", slug).maybeSingle()
  return { title: data?.name ?? "Startup", description: data?.tagline ?? undefined }
}

export default async function StartupPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const user = await getCurrentUser()
  const { data: s } = await supabase.from("startups").select("*, categories(name, slug)").eq("slug", slug).maybeSingle()
  if (!s) notFound()
  const [{ data: team }, { data: milestones }, { data: opps }] = await Promise.all([
    supabase.from("startup_members").select("title, is_founder, profiles(id, full_name, avatar_url, headline)").eq("startup_id", s.id),
    supabase.from("startup_milestones").select("id, title, description, achieved_on").eq("startup_id", s.id).order("achieved_on", { ascending: false, nullsFirst: false }),
    user ? supabase.from("opportunities").select("id, title, type").eq("startup_id", s.id).eq("status", "open") : Promise.resolve({ data: null }),
  ])
  const isOwner = user?.id === s.owner_id
  const facts = [
    { icon: Target, label: "Target market", value: s.target_market },
    { icon: Wallet, label: "Business model", value: s.business_model },
    { icon: Users, label: "Team size", value: s.team_size ? `${s.team_size} people` : null },
    { icon: MapPin, label: "Location", value: s.location },
    { icon: Calendar, label: "Founded", value: s.founded_year?.toString() },
  ].filter((f) => f.value)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href={user ? "/dashboard" : "/"}>
            <Logo />
          </Link>
          {user ? (
            <LinkButton href="/dashboard" variant="outline" size="sm">
              Back to dashboard
            </LinkButton>
          ) : (
            <div className="flex gap-2">
              <LinkButton href="/login" variant="ghost" size="sm">
                Sign in
              </LinkButton>
              <LinkButton href="/signup" size="sm">
                Join Cofoundry
              </LinkButton>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Panel className="overflow-hidden">
          {s.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.cover_url} alt="" className="h-40 w-full object-cover sm:h-56" />
          ) : (
            <div className="h-32 bg-brand-gradient sm:h-44" />
          )}
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <StartupLogo name={s.name} src={s.logo_url} size="xl" className="ring-4 ring-white" />
              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <LinkButton href="/startup" variant="outline">
                    Edit startup
                  </LinkButton>
                )}
                {s.website_url && (
                  <a href={s.website_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/85">
                    <Globe className="size-4" /> Visit website
                  </a>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{s.name}</h1>
              {s.is_verified && <VerifiedBadge label="Verified startup" />}
              <StageBadge stage={s.stage} />
              {s.categories && <Tag>{s.categories.name}</Tag>}
            </div>
            {s.tagline && <p className="mt-2 text-lg text-muted-foreground">{s.tagline}</p>}
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {s.linkedin_url && (
                <a href={s.linkedin_url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-primary hover:underline">
                  <Link2 className="size-3.5" /> LinkedIn
                </a>
              )}
              {s.twitter_url && (
                <a href={s.twitter_url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="size-3.5" /> X / Twitter
                </a>
              )}
            </div>
          </div>
        </Panel>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-6">
            {s.description && (
              <Panel className="p-6">
                <SectionTitle>About</SectionTitle>
                <RichText text={s.description} />
              </Panel>
            )}
            {(s.mission || s.vision) && (
              <div className="grid gap-6 sm:grid-cols-2">
                {s.mission && (
                  <Panel className="p-6">
                    <SectionTitle>Mission</SectionTitle>
                    <p className="text-sm leading-relaxed">{s.mission}</p>
                  </Panel>
                )}
                {s.vision && (
                  <Panel className="p-6">
                    <SectionTitle>Vision</SectionTitle>
                    <p className="text-sm leading-relaxed">{s.vision}</p>
                  </Panel>
                )}
              </div>
            )}
            {s.products && (
              <Panel className="p-6">
                <SectionTitle>Products & services</SectionTitle>
                <RichText text={s.products} />
              </Panel>
            )}
            <Panel className="p-6">
              <SectionTitle>Founding team</SectionTitle>
              <ul className="grid gap-3 sm:grid-cols-2">
                {(team ?? []).map(
                  (m) =>
                    m.profiles && (
                      <li key={m.profiles.id}>
                        <Link href={user ? `/founders/${m.profiles.id}` : "/signup"} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/40">
                          <UserAvatar name={m.profiles.full_name} src={m.profiles.avatar_url} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{m.profiles.full_name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{m.title ?? m.profiles.headline}</span>
                          </span>
                        </Link>
                      </li>
                    )
                )}
              </ul>
            </Panel>
            {milestones && milestones.length > 0 && (
              <Panel className="p-6">
                <SectionTitle>Achievements & milestones</SectionTitle>
                <ol className="relative space-y-5 border-l pl-5">
                  {milestones.map((m) => (
                    <li key={m.id} className="relative">
                      <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-primary ring-4 ring-accent" />
                      <p className="text-sm font-medium">{m.title}</p>
                      {m.achieved_on && <p className="text-xs text-muted-foreground">{format(new Date(m.achieved_on), "MMMM yyyy")}</p>}
                      {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
                    </li>
                  ))}
                </ol>
              </Panel>
            )}
          </div>
          <aside className="space-y-6">
            {facts.length > 0 && (
              <Panel className="p-5">
                <SectionTitle>At a glance</SectionTitle>
                <dl className="space-y-3">
                  {facts.map((f) => (
                    <div key={f.label} className="flex gap-3">
                      <f.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <dt className="text-xs text-muted-foreground">{f.label}</dt>
                        <dd className="text-sm">{f.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </Panel>
            )}
            {s.current_needs.length > 0 && (
              <Panel className="p-5">
                <SectionTitle>Currently looking for</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {s.current_needs.map((n: Capability) => (
                    <Tag key={n} tone="primary">
                      {CAPABILITIES[n].label}
                    </Tag>
                  ))}
                </div>
              </Panel>
            )}
            {opps && opps.length > 0 && (
              <Panel className="p-5">
                <SectionTitle>Open opportunities</SectionTitle>
                <ul className="space-y-3">
                  {opps.map((o) => (
                    <li key={o.id}>
                      <Link href={`/opportunities/${o.id}`} className="block text-sm font-medium hover:text-primary">
                        {o.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">{OPPORTUNITY_TYPES[o.type].label}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
            {!user && (
              <Panel className="bg-soft-gradient p-5">
                <p className="text-sm font-medium">Want to collaborate with {s.name}?</p>
                <p className="mt-1 text-sm text-muted-foreground">Join Cofoundry to connect with the team and see their open opportunities.</p>
                <LinkButton href="/signup" className="mt-3 w-full">
                  Join free
                </LinkButton>
              </Panel>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
