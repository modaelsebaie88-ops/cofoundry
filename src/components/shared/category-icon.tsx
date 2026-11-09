import {
  AppWindow,
  Blocks,
  BrainCircuit,
  Briefcase,
  Cpu,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Landmark,
  Leaf,
  Megaphone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  "brain-circuit": BrainCircuit,
  "app-window": AppWindow,
  landmark: Landmark,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  "shopping-bag": ShoppingBag,
  megaphone: Megaphone,
  "shield-check": ShieldCheck,
  blocks: Blocks,
  leaf: Leaf,
  "gamepad-2": Gamepad2,
  cpu: Cpu,
  briefcase: Briefcase,
  sparkles: Sparkles,
  users: Users,
}

export const ICON_NAMES = Object.keys(ICONS)

const TONES = [
  "from-violet-100 to-indigo-50 text-violet-700",
  "from-sky-100 to-blue-50 text-sky-700",
  "from-emerald-100 to-teal-50 text-emerald-700",
  "from-amber-100 to-orange-50 text-amber-700",
  "from-rose-100 to-pink-50 text-rose-700",
  "from-fuchsia-100 to-purple-50 text-fuchsia-700",
]

export function CategoryIcon({ name, seed = 0, size = "md", className }: { name: string; seed?: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = ICONS[name] ?? Users
  const s = { sm: "size-8 rounded-lg [&_svg]:size-4", md: "size-11 rounded-xl [&_svg]:size-5", lg: "size-16 rounded-2xl [&_svg]:size-7" }[size]
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center bg-gradient-to-br", TONES[seed % TONES.length], s, className)}>
      <Icon />
    </span>
  )
}
