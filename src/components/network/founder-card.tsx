import Link from "next/link"
import { MapPin } from "lucide-react"
import { ConnectButton } from "@/components/network/connect-button"
import { DemoBadge, StageBadge, Tag, VerifiedBadge } from "@/components/shared/badges"
import { LinkButton } from "@/components/shared/link-button"
import { StartupLogo, UserAvatar } from "@/components/shared/user-avatar"
import type { ConnectionState, FounderCardData } from "@/lib/queries/network"
import { cn, truncate } from "@/lib/utils"

export function FounderCard({
  founder: f,
  connection,
  layout = "grid",
  isSelf,
}: {
  founder: FounderCardData
  connection: ConnectionState
  layout?: "grid" | "list"
  isSelf?: boolean
}) {
  const location = [f.city, f.country].filter(Boolean).join(", ")
  const actions = (
    <div className={cn("flex gap-2", layout === "grid" && "mt-auto pt-4")}>
      <LinkButton href={`/founders/${f.id}`} variant="outline" size="sm" className={layout === "grid" ? "flex-1" : undefined}>
        View profile
      </LinkButton>
      {!isSelf && <ConnectButton targetId={f.id} targetName={f.full_name} state={connection} className={layout === "grid" ? "flex-1" : undefined} />}
    </div>
  )

  if (layout === "list") {
    return (
      <div className="card-hover flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row sm:items-center">
        <Link href={`/founders/${f.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <UserAvatar name={f.full_name} src={f.avatar_url} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold">{f.full_name}</span>
              {f.is_verified && <VerifiedBadge />}
              {f.is_demo && <DemoBadge />}
            </div>
            <p className="truncate text-sm text-muted-foreground">{f.headline}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {f.startup && (
                <span className="text-xs font-medium text-foreground/80">
                  {f.startup.name}
                  {f.startup.category && <span className="text-muted-foreground"> · {f.startup.category}</span>}
                </span>
              )}
              {f.startup && <StageBadge stage={f.startup.stage} />}
              {f.skills.slice(0, 3).map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </div>
          </div>
        </Link>
        {actions}
      </div>
    )
  }

  return (
    <div className="card-hover flex h-full flex-col rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <UserAvatar name={f.full_name} src={f.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <Link href={`/founders/${f.id}`} className="flex items-center gap-1.5 hover:underline">
            <span className="truncate font-semibold">{f.full_name}</span>
            {f.is_verified && <VerifiedBadge />}
          </Link>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{f.headline}</p>
          {f.is_demo && (
            <div className="mt-1">
              <DemoBadge />
            </div>
          )}
        </div>
      </div>
      {f.startup ? (
        <div className="mt-4 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <StartupLogo name={f.startup.name} src={f.startup.logo_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.startup.name}</p>
              <p className="truncate text-xs text-muted-foreground">{f.startup.category ?? "—"}</p>
            </div>
            <StageBadge stage={f.startup.stage} />
          </div>
          {(f.startup.tagline || f.startup.description) && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{truncate(f.startup.tagline || f.startup.description, 140)}</p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
          {f.seeking_cofounder ? "Exploring ideas · open to joining a team as co-founder" : "No startup listed yet"}
        </div>
      )}
      {f.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {f.skills.slice(0, 4).map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
          {f.skills.length > 4 && <Tag className="text-muted-foreground">+{f.skills.length - 4}</Tag>}
        </div>
      )}
      {location && (
        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" /> {location}
        </p>
      )}
      {actions}
    </div>
  )
}
