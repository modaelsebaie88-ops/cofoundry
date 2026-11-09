import { Award, HandHeart, Handshake, MessageSquareHeart, Network, Sparkles, type LucideIcon } from "lucide-react"

export type ReputationStats = {
  posts: number
  comments: number
  accepted_answers: number
  reactions_received: number
  connections: number
  endorsements: number
  workspaces: number
  accepted_applications: number
  mentorship_sessions: number
  events_attended: number
}

export type ReputationBadge = { key: string; label: string; description: string; icon: LucideIcon; tier: "bronze" | "silver" | "gold" }

/**
 * Contribution badges earned from real platform activity (never self-assigned).
 * Thresholds are intentionally modest for an early community.
 */
export function computeBadges(s: ReputationStats): ReputationBadge[] {
  const out: ReputationBadge[] = []
  const tier = (n: number, silver: number, gold: number) => (n >= gold ? "gold" : n >= silver ? "silver" : "bronze")
  if (s.accepted_answers >= 1)
    out.push({ key: "helpful", label: "Helpful answerer", description: `${s.accepted_answers} answer(s) accepted by other founders`, icon: HandHeart, tier: tier(s.accepted_answers, 3, 10) })
  if (s.posts + s.comments >= 5)
    out.push({ key: "contributor", label: "Active contributor", description: `${s.posts} posts and ${s.comments} replies in communities`, icon: MessageSquareHeart, tier: tier(s.posts + s.comments, 25, 100) })
  if (s.reactions_received >= 5)
    out.push({ key: "favourite", label: "Community favourite", description: `${s.reactions_received} reactions on posts`, icon: Sparkles, tier: tier(s.reactions_received, 25, 100) })
  if (s.connections >= 5)
    out.push({ key: "connector", label: "Connector", description: `${s.connections} founder connections`, icon: Network, tier: tier(s.connections, 25, 100) })
  const collabs = s.workspaces + s.accepted_applications
  if (collabs >= 1)
    out.push({ key: "collaborator", label: "Collaborator", description: `${collabs} collaboration(s) through workspaces and opportunities`, icon: Handshake, tier: tier(collabs, 3, 10) })
  if (s.mentorship_sessions >= 1)
    out.push({ key: "mentorship", label: "Mentorship", description: `${s.mentorship_sessions} completed mentorship session(s)`, icon: Award, tier: tier(s.mentorship_sessions, 5, 20) })
  return out
}
