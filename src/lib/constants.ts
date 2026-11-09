import type { Database } from "@/lib/database.types"

type Enums = Database["public"]["Enums"]
export type Capability = Enums["capability"]
export type StartupStage = Enums["startup_stage"]
export type CollabType = Enums["collab_type"]
export type Availability = Enums["availability"]
export type OpportunityType = Enums["opportunity_type"]
export type EventType = Enums["event_type"]
export type ResourceCategory = Enums["resource_category"]
export type AppRole = Enums["app_role"]

export const APP_NAME = "Cofoundry"

export const CAPABILITIES: Record<Capability, { label: string; person: string }> = {
  engineering: { label: "Engineering", person: "Developers & engineers" },
  design: { label: "Design", person: "Designers" },
  marketing: { label: "Marketing & growth", person: "Marketers" },
  sales: { label: "Sales", person: "Sales specialists" },
  product: { label: "Product", person: "Product managers" },
  data_ai: { label: "Data & AI", person: "Data & AI specialists" },
  fundraising: { label: "Fundraising", person: "Fundraising experts" },
  investment: { label: "Investment", person: "Investors" },
  mentorship: { label: "Mentorship", person: "Mentors" },
  legal: { label: "Legal & compliance", person: "Legal experts" },
  operations: { label: "Operations", person: "Operators" },
  business_development: { label: "Business development", person: "Business partners" },
  content: { label: "Content", person: "Content creators" },
  community: { label: "Community", person: "Community builders" },
}
export const CAPABILITY_KEYS = Object.keys(CAPABILITIES) as Capability[]

export const STAGES: Record<StartupStage, { label: string; order: number; description: string }> = {
  idea: { label: "Idea", order: 0, description: "Exploring the problem and validating demand" },
  mvp: { label: "MVP", order: 1, description: "Building or testing a first version" },
  early_traction: { label: "Early traction", order: 2, description: "First users or revenue, searching for fit" },
  growth: { label: "Growth", order: 3, description: "Scaling a repeatable model" },
  established: { label: "Established", order: 4, description: "Mature business expanding further" },
}
export const STAGE_KEYS = Object.keys(STAGES) as StartupStage[]

export const COLLAB_TYPES: Record<CollabType, string> = {
  cofounder: "Co-founder",
  full_time: "Full-time",
  part_time: "Part-time",
  freelance: "Freelance / contract",
  advisory: "Advisory",
  partnership: "Partnership",
  skill_exchange: "Skill exchange",
  investment: "Investment",
}
export const COLLAB_TYPE_KEYS = Object.keys(COLLAB_TYPES) as CollabType[]

export const AVAILABILITY: Record<Availability, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  weekends: "Evenings & weekends",
  few_hours_week: "A few hours a week",
  limited: "Limited right now",
}
export const AVAILABILITY_KEYS = Object.keys(AVAILABILITY) as Availability[]

export const OPPORTUNITY_TYPES: Record<OpportunityType, { label: string; icon: string }> = {
  cofounder: { label: "Looking for a Co-Founder", icon: "handshake" },
  developer: { label: "Looking for Developers", icon: "code" },
  designer: { label: "Looking for Designers", icon: "palette" },
  marketing: { label: "Looking for Marketing Specialists", icon: "megaphone" },
  business_partner: { label: "Looking for Business Partners", icon: "briefcase" },
  mentor: { label: "Looking for Mentors", icon: "compass" },
  investor: { label: "Looking for Investors", icon: "trending-up" },
  team_member: { label: "Looking for Team Members", icon: "users" },
  services_offered: { label: "Offering Professional Services", icon: "badge-check" },
  partnership: { label: "Partnership Opportunities", icon: "link" },
}
export const OPPORTUNITY_TYPE_KEYS = Object.keys(OPPORTUNITY_TYPES) as OpportunityType[]

export const EVENT_TYPES: Record<EventType, string> = {
  networking: "Networking",
  hackathon: "Hackathon",
  pitch: "Pitch competition",
  webinar: "Webinar",
  workshop: "Workshop",
  meetup: "Founder meetup",
  accelerator: "Accelerator program",
}
export const EVENT_TYPE_KEYS = Object.keys(EVENT_TYPES) as EventType[]

export const RESOURCE_CATEGORIES: Record<ResourceCategory, string> = {
  guides: "Startup guides",
  templates: "Business templates",
  pitch_decks: "Pitch decks",
  fundraising: "Fundraising",
  marketing: "Marketing",
  legal_ops: "Legal & operations",
  tools: "Recommended tools",
  success_stories: "Success stories",
}
export const RESOURCE_CATEGORY_KEYS = Object.keys(RESOURCE_CATEGORIES) as ResourceCategory[]

export const ROLES: Record<AppRole, string> = {
  founder: "Founder",
  mentor: "Mentor",
  moderator: "Moderator",
  admin: "Administrator",
}

export const FOUNDER_ROLES = [
  "CEO", "CTO", "COO", "CPO", "CMO", "CFO", "Technical founder", "Business founder",
  "Product lead", "Engineer", "Designer", "Marketer", "Solo founder", "Aspiring founder",
]

export const REPORT_REASONS = {
  spam: "Spam or self-promotion",
  harassment: "Harassment or bullying",
  inappropriate: "Inappropriate content",
  misinformation: "Misleading information",
  scam: "Scam or fraud",
  other: "Something else",
} as const

export const NOTIFICATION_TYPES: Record<string, { label: string; description: string }> = {
  connection_request: { label: "Connection requests", description: "When someone wants to connect" },
  connection_accepted: { label: "Accepted connections", description: "When someone accepts your request" },
  message: { label: "Messages", description: "New direct and group messages" },
  community_reply: { label: "Community replies", description: "Replies to your posts" },
  mention: { label: "Mentions", description: "When someone @mentions you" },
  opportunity_application: { label: "Opportunity applications", description: "When someone applies to your opportunity" },
  application_update: { label: "Application updates", description: "When your application is accepted or declined" },
  event_reminder: { label: "Event reminders", description: "24 hours before events you registered for" },
  recommendation: { label: "New recommendations", description: "When strong new matches are found" },
  workspace: { label: "Workspace updates", description: "Invites, task assignments and updates" },
  mentorship: { label: "Mentorship", description: "Session requests and responses" },
}
