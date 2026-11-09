import Link from "next/link"
import { Compass, MessagesSquare, Sparkles, Users } from "lucide-react"
import { Logo } from "@/components/shell/logo"

const points = [
  { icon: Sparkles, title: "Explainable matches", text: "See exactly why each founder is recommended — needs, skills, stage and industry." },
  { icon: Users, title: "Industry communities", text: "14 focused communities with discussions, Q&A, polls and live chat." },
  { icon: MessagesSquare, title: "From intro to collaboration", text: "Message, share files and spin up private workspaces with tasks and milestones." },
  { icon: Compass, title: "Mentors who've done it", text: "Book sessions with experienced operators and investors." },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-brand-gradient p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-sky-300/20 blur-3xl" />
        <Link href="/" className="relative">
          <Logo inverted />
        </Link>
        <div className="relative mt-auto max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            Find the people who complete your startup.
          </h2>
          <p className="mt-3 text-white/80">
            Cofoundry connects founders with co-founders, collaborators and mentors based on what you need and what you can offer.
          </p>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-sm text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
