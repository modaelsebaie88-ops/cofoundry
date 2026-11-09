import type { Metadata } from "next"
import Link from "next/link"
import { GraduationCap, Inbox, Star } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { STAGES } from "@/lib/constants"
import { Tag, VerifiedBadge, DemoBadge } from "@/components/shared/badges"
import { LinkButton } from "@/components/shared/link-button"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { UserAvatar } from "@/components/shared/user-avatar"
import { RequestCard, type RequestData } from "./request-card"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Mentorship" }

const REQUEST_SELECT =
  "id, topic, message, preferred_times, scheduled_at, meeting_url, mentor_note, status, created_at, mentor_id, mentee_id, mentor:profiles!mentorship_requests_mentor_profile_fkey(id, full_name, avatar_url, headline), mentee:profiles!mentorship_requests_mentee_id_fkey(id, full_name, avatar_url, headline), mentorship_reviews(id)"

export default async function MentorshipPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const sp = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()
  const tab = sp.tab === "requests" ? "requests" : sp.tab === "sessions" ? "sessions" : "mentors"
  const { data: myMentor } = await supabase.from("mentor_profiles").select("profile_id").eq("profile_id", me.id).maybeSingle()
  const [{ count: incomingPending }] = await Promise.all([
    supabase.from("mentorship_requests").select("id", { count: "exact", head: true }).eq("mentor_id", me.id).eq("status", "pending"),
  ])

  const tabs = [
    { key: "mentors", label: "Find a mentor" },
    { key: "sessions", label: "My sessions" },
    ...(myMentor ? [{ key: "requests", label: `Requests to me${incomingPending ? ` (${incomingPending})` : ""}` }] : []),
  ]

  let content: React.ReactNode
  if (tab === "mentors") {
    const { data: mentors } = await supabase
      .from("mentor_profiles")
      .select("profile_id, expertise, focus_stages, about, session_minutes, is_accepting, rating_avg, review_count, profiles!inner(id, full_name, avatar_url, headline, is_verified, is_demo, years_experience)")
      .order("review_count", { ascending: false })
    const q = (sp.q ?? "").toLowerCase().trim()
    const list = (mentors ?? []).filter(
      (m) => !q || m.profiles.full_name.toLowerCase().includes(q) || m.expertise.some((e) => e.toLowerCase().includes(q)) || m.about.toLowerCase().includes(q)
    )
    content = (
      <>
        <form className="mb-4" action="/mentorship">
          <input name="q" defaultValue={sp.q} placeholder="Search by name or expertise (e.g. fundraising, pricing)" className="h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:border-ring sm:w-96" />
        </form>
        {list.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((m) => (
              <Link key={m.profile_id} href={`/mentorship/${m.profile_id}`} className="card-hover flex flex-col rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <UserAvatar name={m.profiles.full_name} src={m.profiles.avatar_url} size="lg" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-semibold">
                      {m.profiles.full_name} {m.profiles.is_verified && <VerifiedBadge />}
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{m.profiles.headline}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {m.review_count > 0 ? (
                        <span className="flex items-center gap-1">
                          <Star className="size-3 fill-amber-400 text-amber-400" /> {Number(m.rating_avg).toFixed(1)} ({m.review_count})
                        </span>
                      ) : (
                        <span>New mentor</span>
                      )}
                      {m.profiles.is_demo && <DemoBadge />}
                    </div>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-foreground/80">{m.about}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.expertise.slice(0, 4).map((e) => (
                    <Tag key={e} tone="primary">
                      {e}
                    </Tag>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>
                    {m.session_minutes}-min sessions
                    {m.focus_stages.length > 0 && ` · ${m.focus_stages.map((s) => STAGES[s].label).join(", ")}`}
                  </span>
                  <span className={m.is_accepting ? "font-medium text-emerald-600" : ""}>{m.is_accepting ? "Accepting" : "Paused"}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={GraduationCap} title="No mentors found" description="Try a different search." />
        )}
      </>
    )
  } else {
    const column = tab === "requests" ? "mentor_id" : "mentee_id"
    const { data: requests } = await supabase.from("mentorship_requests").select(REQUEST_SELECT).eq(column, me.id).order("created_at", { ascending: false })
    content = requests?.length ? (
      <div className="space-y-4">
        {requests.map((r) => (
          <RequestCard key={r.id} request={r as unknown as RequestData} asMentor={tab === "requests"} />
        ))}
      </div>
    ) : (
      <EmptyState
        icon={Inbox}
        title={tab === "requests" ? "No session requests yet" : "No mentorship sessions yet"}
        description={tab === "requests" ? "Founders will find you in the mentor directory." : "Browse mentors and request a session."}
        action={tab === "sessions" ? <LinkButton href="/mentorship">Find a mentor</LinkButton> : undefined}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Mentorship"
        description="Book sessions with experienced founders, operators and investors — or share what you've learned."
        actions={
          <LinkButton href="/mentorship/profile" variant={myMentor ? "outline" : "default"}>
            <GraduationCap /> {myMentor ? "Edit mentor profile" : "Become a mentor"}
          </LinkButton>
        }
      />
      <div className="mb-6 flex gap-1 border-b">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "mentors" ? "/mentorship" : `/mentorship?tab=${t.key}`}
            className={cn("-mb-px border-b-2 px-3 py-2.5 text-sm font-medium", tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {content}
    </div>
  )
}
