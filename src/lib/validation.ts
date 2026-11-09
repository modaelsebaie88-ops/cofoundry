import { z } from "zod"
import {
  AVAILABILITY_KEYS,
  CAPABILITY_KEYS,
  COLLAB_TYPE_KEYS,
  EVENT_TYPE_KEYS,
  OPPORTUNITY_TYPE_KEYS,
  STAGE_KEYS,
} from "@/lib/constants"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null))
  .refine((v) => v === null || /^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(v), "Enter a valid URL")

export const capability = z.enum(CAPABILITY_KEYS as [string, ...string[]])
export const stage = z.enum(STAGE_KEYS as [string, ...string[]])
export const collabType = z.enum(COLLAB_TYPE_KEYS as [string, ...string[]])

export const personalSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  avatar_url: optionalText(500),
  headline: z.string().trim().min(5, "Add a short headline").max(160),
  country: z.string().trim().min(2, "Select your country").max(80),
  city: optionalText(80),
  linkedin_url: optionalUrl,
  website_url: optionalUrl,
  bio: optionalText(2000),
})

export const startupSchema = z.object({
  name: z.string().trim().min(1, "Enter your startup's name").max(100),
  tagline: optionalText(160),
  description: z.string().trim().min(20, "Describe your startup in at least 20 characters").max(5000),
  logo_url: optionalText(500),
  cover_url: optionalText(500),
  category_id: z.coerce.number().int().positive("Pick an industry"),
  stage: stage,
  website_url: optionalUrl,
  target_market: optionalText(300),
  business_model: optionalText(300),
  team_size: z.coerce.number().int().min(1).max(100000).optional().nullable(),
  mission: optionalText(1000),
  vision: optionalText(1000),
  products: optionalText(3000),
  current_needs: z.array(capability).max(8).default([]),
  location: optionalText(120),
  founded_year: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  twitter_url: optionalUrl,
  linkedin_url: optionalUrl,
})

export const founderSchema = z.object({
  founder_role: z.string().trim().min(2, "Pick your role").max(80),
  years_experience: z.coerce.number().int().min(0).max(60),
  previous_experience: optionalText(2000),
  help_topics: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  skills: z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one skill").max(20),
  learning: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  interests: z.array(z.coerce.number().int().positive()).min(1, "Pick at least one industry").max(8),
})

export const collaborationSchema = z.object({
  looking_for: z.array(capability).max(8).default([]),
  offers: z.array(capability).min(1, "Pick at least one thing you can offer").max(8),
  seeking_cofounder: z.boolean(),
  open_to_partnerships: z.boolean(),
  collaboration_types: z.array(collabType).max(8).default([]),
  availability: z.enum(AVAILABILITY_KEYS as [string, ...string[]]),
})

export const opportunitySchema = z.object({
  type: z.enum(OPPORTUNITY_TYPE_KEYS as [string, ...string[]]),
  title: z.string().trim().min(5, "Use at least 5 characters").max(140),
  description: z.string().trim().min(20, "Describe the opportunity in at least 20 characters").max(6000),
  required_skills: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  stage: stage.optional().nullable(),
  collaboration_type: collabType,
  requirements: optionalText(3000),
  location: optionalText(120),
  is_remote: z.boolean(),
  attach_startup: z.boolean().default(true),
})

export const eventSchema = z
  .object({
    title: z.string().trim().min(5).max(140),
    description: z.string().trim().min(20, "Describe the event in at least 20 characters").max(6000),
    type: z.enum(EVENT_TYPE_KEYS as [string, ...string[]]),
    starts_at: z.string().min(1, "Pick a start time"),
    ends_at: z.string().min(1, "Pick an end time"),
    is_online: z.boolean(),
    location: optionalText(200),
    meeting_url: optionalUrl,
    capacity: z.coerce.number().int().min(1).max(100000).optional().nullable(),
    community_id: z.string().uuid().optional().nullable(),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), { message: "End must be after start", path: ["ends_at"] })
  .refine((v) => new Date(v.starts_at) > new Date(Date.now() - 3600_000), { message: "Start time must be in the future", path: ["starts_at"] })
  .refine((v) => v.is_online || v.location, { message: "Add a location for in-person events", path: ["location"] })

export function zodFieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    out[key] ??= issue.message
  }
  return out
}
