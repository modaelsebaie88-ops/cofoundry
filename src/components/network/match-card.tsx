"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { ChevronDown, Lightbulb, X } from "lucide-react"
import { toast } from "sonner"
import { dismissRecommendation } from "@/actions/network"
import { ConnectButton } from "@/components/network/connect-button"
import { DemoBadge, StageBadge, Tag, VerifiedBadge } from "@/components/shared/badges"
import { SaveButton } from "@/components/shared/save-button"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import type { FactorResult } from "@/lib/matching/engine"
import type { ConnectionState, FounderCardData } from "@/lib/queries/network"
import { cn } from "@/lib/utils"

export type MatchReasons = {
  summary: string
  factors: FactorResult[]
  sharedInterests: string[]
  complementarySkills: string[]
  suggestion: string
}

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const tone = score >= 70 ? "text-primary" : score >= 45 ? "text-violet-400" : "text-zinc-400"
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${score}% compatibility`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100}
          className={cn("stroke-current transition-[stroke-dashoffset] duration-700", tone)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-semibold">{score}%</span>
        <span className="text-[9px] text-muted-foreground">match</span>
      </span>
    </div>
  )
}

export function FactorBreakdown({ factors }: { factors: FactorResult[] }) {
  return (
    <ul className="space-y-2.5">
      {factors.map((f) => (
        <li key={f.key}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{f.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {f.points} / {f.max}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(f.points / f.max) * 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{f.detail}</p>
        </li>
      ))}
    </ul>
  )
}

export function MatchCard({
  founder,
  score,
  reasons,
  connection,
  saved,
  compact,
}: {
  founder: FounderCardData
  score: number
  reasons: MatchReasons
  connection: ConnectionState
  saved: boolean
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [pending, start] = useTransition()
  if (hidden) return null

  return (
    <article className="card-hover flex h-full flex-col rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <UserAvatar name={founder.full_name} src={founder.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <Link href={`/founders/${founder.id}`} className="flex items-center gap-1.5 hover:underline">
            <span className="truncate font-semibold">{founder.full_name}</span>
            {founder.is_verified && <VerifiedBadge />}
          </Link>
          <p className="line-clamp-1 text-sm text-muted-foreground">{founder.headline}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {founder.startup && <span className="text-xs font-medium text-foreground/75">{founder.startup.name}</span>}
            {founder.startup && <StageBadge stage={founder.startup.stage} />}
            {founder.is_demo && <DemoBadge />}
          </div>
        </div>
        <ScoreRing score={score} />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground/85">{reasons.summary}</p>

      {!compact && (reasons.complementarySkills.length > 0 || reasons.sharedInterests.length > 0) && (
        <div className="mt-3 space-y-2">
          {reasons.complementarySkills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Complementary skills</span>
              {reasons.complementarySkills.slice(0, 4).map((s) => (
                <Tag key={s} tone="primary">
                  {s}
                </Tag>
              ))}
            </div>
          )}
          {reasons.sharedInterests.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Shared interests</span>
              {reasons.sharedInterests.slice(0, 3).map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2 rounded-xl bg-soft-gradient p-3 text-xs text-foreground/80">
        <Lightbulb className="size-4 shrink-0 text-primary" />
        <span>{reasons.suggestion}</span>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
        aria-expanded={expanded}
      >
        How this score is calculated
        <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="mt-3 rounded-xl border p-3">
          <FactorBreakdown factors={reasons.factors} />
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-4">
        <ConnectButton targetId={founder.id} targetName={founder.full_name} state={connection} className="flex-1" showMessage />
        <SaveButton itemType="founder" itemId={founder.id} saved={saved} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss recommendation"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await dismissRecommendation(founder.id)
              if (r.ok) {
                setHidden(true)
                toast("Recommendation dismissed", { description: "We won't suggest this founder again." })
              } else toast.error(r.error)
            })
          }
        >
          <X />
        </Button>
      </div>
    </article>
  )
}
