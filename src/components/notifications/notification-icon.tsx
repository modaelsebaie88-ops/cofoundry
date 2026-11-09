import {
  AtSign,
  Bell,
  Briefcase,
  CalendarClock,
  GraduationCap,
  MessageCircle,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  SquareKanban,
  UserCheck,
  UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MAP = {
  connection_request: { icon: UserPlus, cls: "bg-violet-100 text-violet-700" },
  connection_accepted: { icon: UserCheck, cls: "bg-emerald-100 text-emerald-700" },
  message: { icon: MessagesSquare, cls: "bg-sky-100 text-sky-700" },
  community_reply: { icon: MessageCircle, cls: "bg-indigo-100 text-indigo-700" },
  mention: { icon: AtSign, cls: "bg-fuchsia-100 text-fuchsia-700" },
  opportunity_application: { icon: Briefcase, cls: "bg-amber-100 text-amber-700" },
  application_update: { icon: Briefcase, cls: "bg-amber-100 text-amber-700" },
  event_reminder: { icon: CalendarClock, cls: "bg-rose-100 text-rose-700" },
  recommendation: { icon: Sparkles, cls: "bg-violet-100 text-violet-700" },
  workspace: { icon: SquareKanban, cls: "bg-teal-100 text-teal-700" },
  mentorship: { icon: GraduationCap, cls: "bg-blue-100 text-blue-700" },
  verification: { icon: ShieldCheck, cls: "bg-emerald-100 text-emerald-700" },
} as const

export function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const m = MAP[type as keyof typeof MAP] ?? { icon: Bell, cls: "bg-muted text-muted-foreground" }
  const Icon = m.icon
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", m.cls, className)}>
      <Icon className="size-4" />
    </span>
  )
}
