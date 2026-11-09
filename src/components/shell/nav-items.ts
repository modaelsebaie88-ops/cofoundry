import {
  Bot,
  BookOpen,
  Briefcase,
  CalendarDays,
  GraduationCap,
  Compass,
  LayoutDashboard,
  MessagesSquare,
  Repeat2,
  Rocket,
  Settings,
  Shield,
  ShieldAlert,
  SquareKanban,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: "messages" }

export const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/discover", label: "Discover Founders", icon: Compass },
      { href: "/communities", label: "Communities", icon: Users },
      { href: "/messages", label: "Messages", icon: MessagesSquare, badge: "messages" },
      { href: "/opportunities", label: "Opportunities", icon: Briefcase },
    ],
  },
  {
    title: "Build",
    items: [
      { href: "/startup", label: "My Startup", icon: Rocket },
      { href: "/workspaces", label: "Workspaces", icon: SquareKanban },
      { href: "/network", label: "My Network", icon: UsersRound },
      { href: "/skill-exchange", label: "Skill Exchange", icon: Repeat2 },
    ],
  },
  {
    title: "Grow",
    items: [
      { href: "/events", label: "Events", icon: CalendarDays },
      { href: "/mentorship", label: "Mentorship", icon: GraduationCap },
      { href: "/resources", label: "Resource Library", icon: BookOpen },
      { href: "/assistant", label: "AI Assistant", icon: Bot },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings }
export const ADMIN_ITEM: NavItem = { href: "/admin", label: "Admin", icon: Shield }
export const MODERATION_ITEM: NavItem = { href: "/moderation", label: "Moderation", icon: ShieldAlert }
