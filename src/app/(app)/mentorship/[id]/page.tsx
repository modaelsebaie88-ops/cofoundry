import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Clock, Star } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { STAGES } from "@/lib/constants"
import { DemoBadge, Tag, VerifiedBadge } from "@/components/shared/badges"
import { LinkButton } from "@/components/shared/link-button"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { UserAvatar } from "@/components/shared/user-avatar"
import { BookingForm } from "./booking-form"

export const metadata: Metadata = { title: "Mentor" }

export default async function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: m } = await supabase
    .from("mentor_profiles")
    .select("*, profiles!inner(id, full_name, avatar_url, headline, is_verified, is_demo, years_experience, bio)")
    .eq("profile_id", id)
    .maybeSingle()
  if (!m) notFound()
  const [{ data: reviews }, { data: openRequest }] = await Promise.all([
    supabase
      .from("mentorship_reviews")
      .select("id, rating, comment, created_at, reviewer:profiles!mentorship_reviews_reviewer_id_fkey(id, full_name, avatar_url)")
      .eq("mentor_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("mentorship_requests").select("id, status").eq("mentor_id", id).eq("mentee_id", me.id).in("status", ["pending", "accepted"]).maybeSingle(),
  ])
  const isSelf = me.id === id
  const p = m.profiles

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/mentorship" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Mentors
      </Link>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Panel className="p-6">
            <div className="flex items-start gap-4">
              <UserAvatar name={p.full_name} src={p.avatar_url} size="xl" />
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
                  {p.full_name} {p.is_verified && <VerifiedBadge />} {p.is_demo && <DemoBadge />}
                </h1>
                <p className="text-muted-foreground">{p.headline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {m.review_count > 0 ? (
                    <span className="flex items-center gap-1">
                      <Star className="size-4 fill-amber-400 text-amber-400" /> {Number(m.rating_avg).toFixed(1)} · {m.review_count} reviews
                    </span>
                  ) : (
                    <span>No reviews yet</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" /> {m.session_minutes}-minute sessions · up to {m.sessions_per_month}/month
                  </span>
                </div>
                <Link href={`/founders/${p.id}`} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                  View full founder profile →
                </Link>
              </div>
            </div>
          </Panel>
          <Panel className="space-y-5 p-6">
            <div>
              <SectionTitle>How I can help</SectionTitle>
              <p className="text-sm leading-relaxed whitespace-pre-line">{m.about}</p>
            </div>
            <div>
              <SectionTitle>Areas of expertise</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {m.expertise.map((e) => (
                  <Tag key={e} tone="primary">
                    {e}
                  </Tag>
                ))}
              </div>
            </div>
            {m.focus_stages.length > 0 && (
              <div>
                <SectionTitle>Best for startups at</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {m.focus_stages.map((s) => (
                    <Tag key={s}>{STAGES[s].label}</Tag>
                  ))}
                </div>
              </div>
            )}
            {m.availability_note && (
              <div>
                <SectionTitle>Availability</SectionTitle>
                <p className="text-sm">{m.availability_note}</p>
              </div>
            )}
          </Panel>
          <Panel className="p-6">
            <SectionTitle>Reviews & feedback</SectionTitle>
            {reviews?.length ? (
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="flex gap-3">
                    <UserAvatar name={r.reviewer?.full_name} src={r.reviewer?.avatar_url} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.reviewer?.full_name}</span>
                        <span className="flex">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </span>
                      </div>
                      {r.comment && <p className="mt-1 text-sm text-foreground/85">{r.comment}</p>}
                      <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Reviews appear after completed sessions.</p>
            )}
          </Panel>
        </div>
        <aside>
          <Panel className="sticky top-20 p-5">
            {isSelf ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">This is your mentor profile.</p>
                <LinkButton href="/mentorship/profile" className="w-full">
                  Edit mentor profile
                </LinkButton>
                <LinkButton href="/mentorship?tab=requests" variant="outline" className="w-full">
                  View requests
                </LinkButton>
              </div>
            ) : openRequest ? (
              <div className="space-y-3 text-center">
                <p className="text-sm">
                  You have a <span className="font-medium">{openRequest.status}</span> session with {p.full_name.split(" ")[0]}.
                </p>
                <LinkButton href="/mentorship?tab=sessions" variant="outline" className="w-full">
                  View my sessions
                </LinkButton>
              </div>
            ) : m.is_accepting ? (
              <BookingForm mentorId={id} mentorName={p.full_name} />
            ) : (
              <p className="text-center text-sm text-muted-foreground">{p.full_name.split(" ")[0]} isn&apos;t accepting new requests right now.</p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  )
}
