import { cn } from "@/lib/utils"

/** Brand mark: two overlapping rings on the brand gradient (CSS gradient, so multiple instances never clash). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-brand-gradient", className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="size-full">
        <circle cx="12.5" cy="16" r="6" fill="none" stroke="white" strokeWidth="2.6" />
        <circle cx="19.5" cy="16" r="6" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="2.6" />
      </svg>
    </span>
  )
}

export function Logo({ inverted, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={inverted ? "ring-1 ring-white/30" : undefined} />
      <span className={cn("text-[17px] font-semibold tracking-tight", inverted ? "text-white" : "text-foreground")}>Cofoundry</span>
    </span>
  )
}
