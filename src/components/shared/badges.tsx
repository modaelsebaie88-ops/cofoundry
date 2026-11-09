import { BadgeCheck, FlaskConical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { STAGES, type StartupStage } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function VerifiedBadge({ label = "Verified founder", className }: { label?: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn("inline-flex text-primary", className)} aria-label={label} />}>
        <BadgeCheck className="size-4 fill-primary/10" />
      </TooltipTrigger>
      <TooltipContent>{label} — reviewed by the Cofoundry team</TooltipContent>
    </Tooltip>
  )
}

export function DemoBadge() {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <Badge variant="outline" className="gap-1 border-dashed text-[10px] font-medium text-muted-foreground">
          <FlaskConical className="size-3" /> Demo
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Seeded demo account for development — not a real person</TooltipContent>
    </Tooltip>
  )
}

const stageColors: Record<StartupStage, string> = {
  idea: "bg-sky-50 text-sky-700 border-sky-200",
  mvp: "bg-violet-50 text-violet-700 border-violet-200",
  early_traction: "bg-amber-50 text-amber-700 border-amber-200",
  growth: "bg-emerald-50 text-emerald-700 border-emerald-200",
  established: "bg-zinc-100 text-zinc-700 border-zinc-200",
}

export function StageBadge({ stage }: { stage: StartupStage }) {
  return (
    <Badge variant="outline" className={cn("font-medium", stageColors[stage])}>
      {STAGES[stage].label}
    </Badge>
  )
}

export function Tag({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode
  className?: string
  tone?: "default" | "primary" | "success"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "default" && "bg-muted text-foreground/75",
        tone === "primary" && "bg-accent text-accent-foreground",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        className
      )}
    >
      {children}
    </span>
  )
}
