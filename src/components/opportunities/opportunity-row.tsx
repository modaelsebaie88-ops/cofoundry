import Link from "next/link"
import { Globe, MapPin, Users } from "lucide-react"
import { Tag } from "@/components/shared/badges"
import { RelativeTime } from "@/components/shared/relative-time"
import { StartupLogo, UserAvatar } from "@/components/shared/user-avatar"
import { COLLAB_TYPES, OPPORTUNITY_TYPES, type CollabType, type OpportunityType } from "@/lib/constants"

export type OpportunityListItem = {
  id: string
  type: OpportunityType
  title: string
  description: string
  required_skills: string[]
  collaboration_type: CollabType
  location: string | null
  is_remote: boolean
  status: string
  application_count: number
  created_at: string
  categories: { name: string } | null
  author: { id: string; full_name: string; avatar_url: string | null } | null
  startup: { name: string; slug: string; logo_url: string | null } | null
}

export function OpportunityRow({ opportunity: o, reason }: { opportunity: OpportunityListItem; reason?: string | null }) {
  return (
    <Link href={`/opportunities/${o.id}`} className="flex gap-4 p-4 transition hover:bg-muted/40">
      {o.startup ? (
        <StartupLogo name={o.startup.name} src={o.startup.logo_url} />
      ) : (
        <UserAvatar name={o.author?.full_name} src={o.author?.avatar_url} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="primary">{OPPORTUNITY_TYPES[o.type].label.replace("Looking for ", "")}</Tag>
          <span className="text-xs text-muted-foreground">{COLLAB_TYPES[o.collaboration_type]}</span>
          {o.status === "closed" && <Tag>Closed</Tag>}
        </div>
        <p className="mt-1 line-clamp-1 font-medium">{o.title}</p>
        <p className="line-clamp-1 text-sm text-muted-foreground">{o.description}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            {o.startup?.name ?? o.author?.full_name}
            {o.categories && ` · ${o.categories.name}`}
          </span>
          <span className="flex items-center gap-1">
            {o.is_remote ? <Globe className="size-3" /> : <MapPin className="size-3" />}
            {o.is_remote ? "Remote" : o.location ?? "On-site"}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3" /> {o.application_count} applied
          </span>
          <RelativeTime date={o.created_at} />
          {reason && <span className="font-medium text-primary">Suggested: {reason}</span>}
        </div>
      </div>
    </Link>
  )
}
