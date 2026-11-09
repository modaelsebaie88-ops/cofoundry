import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, BadgeCheck, Bot, Briefcase, GraduationCap, MessagesSquare, Repeat2, Sparkles, SquareKanban, Users } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Logo } from "@/components/shell/logo"
import { LinkButton } from "@/components/shared/link-button"
import { CategoryIcon } from "@/components/shared/category-icon"

const FEATURES = [
  { icon: Sparkles, title: "Explainable founder matching", text: "Every recommendation shows its score breakdown: needs vs. offers, complementary skills, industry, stage and preferences." },
  { icon: Users, title: "Industry communities", text: "Discussions, Q&A with accepted answers, polls, announcements and real-time chat in 14 focused communities." },
  { icon: Briefcase, title: "Opportunities marketplace", text: "Post and apply for co-founder roles, team positions, partnerships, investment and professional services." },
  { icon: MessagesSquare, title: "Real-time messaging", text: "1:1 and group conversations with file sharing, typing indicators, online status and message search." },
  { icon: SquareKanban, title: "Private workspaces", text: "Turn a promising intro into a project with shared tasks, milestones, discussions and files." },
  { icon: GraduationCap, title: "Mentorship hub", text: "Book sessions with experienced founders and operators, with scheduling and reviews." },
  { icon: Repeat2, title: "Skill exchange", text: "Trade expertise with founders who need what you know and know what you need." },
  { icon: Bot, title: "AI startup assistant", text: "Advice grounded in your profile and live platform data — team gaps, collaborators, intros." },
  { icon: BadgeCheck, title: "Trust built in", text: "Human-reviewed verification, contribution-based reputation, moderation and reporting." },
]

export default async function Landing() {
  const user = await getCurrentUser()
  if (user) redirect("/dashboard")
  const supabase = await createClient()
  const { data: categories } = await supabase.from("categories").select("id, name, icon").order("sort_order")

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-transparent bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <LinkButton href="/login" variant="ghost">
              Sign in
            </LinkButton>
            <LinkButton href="/signup">Get started</LinkButton>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[36rem] max-w-5xl rounded-full bg-gradient-to-br from-violet-200/60 via-indigo-100/50 to-sky-100/60 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 pt-20 pb-16 text-center sm:pt-28">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
            <Sparkles className="size-3.5" /> The collaboration network for startup founders
          </p>
          <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl">
            Find the people who <span className="text-brand-gradient">complete your startup.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Cofoundry matches founders with co-founders, collaborators and mentors based on what you need and what you can offer — then gives you the tools to actually build together.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton href="/signup" size="lg" className="h-11 px-6 text-base">
              Create your founder profile <ArrowRight />
            </LinkButton>
            <LinkButton href="/login" size="lg" variant="outline" className="h-11 bg-white px-6 text-base">
              Sign in
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mx-auto max-w-3xl rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">How a match is explained</p>
          <p className="mt-3 text-lg leading-relaxed">
            “Recommended because you&apos;re building an AI SaaS startup and need engineering and marketing, and this founder brings engineering — skilled in full-stack development and LLM applications, with 8 years of experience.”
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Covers what you need", 21, 28],
              ["Complementary skills", 14, 14],
              ["Industry fit", 14, 14],
            ].map(([l, p, m]) => (
              <div key={l as string}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{l}</span>
                  <span className="text-muted-foreground">
                    {p}/{m}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${((p as number) / (m as number)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Illustrative example. Real scores are computed from members&apos; actual profiles — no black boxes.</p>
        </div>
      </section>

      <section className="border-y bg-white/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Everything you need to go from intro to collaboration</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <f.icon className="size-5" />
                </span>
                <p className="mt-4 font-semibold">{f.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Communities for every industry</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {(categories ?? []).map((c, i) => (
            <span key={c.id} className="flex items-center gap-2 rounded-full border bg-card py-1.5 pr-4 pl-1.5 text-sm shadow-sm">
              <CategoryIcon name={c.icon} size="sm" seed={i} className="rounded-full" /> {c.name}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight">Your next co-founder is already here.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Set up your profile in about three minutes and get your first matches immediately.</p>
          <LinkButton href="/signup" size="lg" variant="secondary" className="mt-8 h-11 px-6 text-base">
            Join Cofoundry <ArrowRight />
          </LinkButton>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Cofoundry. Built for founders.</p>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  )
}
