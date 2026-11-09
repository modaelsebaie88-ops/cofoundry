# Architecture

## Principles

- **The database is the security boundary.** Every table has Row-Level Security. The app talks to Supabase *as the signed-in user*, so a bug in a page can't leak or modify data the user isn't allowed to touch. Column guards (`BEFORE` triggers) stop users from changing protected fields: role, verification, counters, ownership and status transitions.
- **No fake functionality.** Counters are trigger-maintained. Match scores come from a transparent formula. Verification requires an admin review. Reputation badges are computed from real activity. The AI assistant only runs with a configured provider, and demo data is labelled.
- **Server-first UI.** Pages are React Server Components that query Supabase directly. Mutations are server actions validated with zod that return `{ ok, error, fieldErrors }`. Client components handle interactivity, optimistic updates and Realtime.

## Request flow

```
Browser ──► proxy.ts (refresh session cookie, redirect signed-out users)
        ──► Server Component / Server Action ──► Supabase (as user; RLS enforced)
        ◄── Realtime websocket (postgres_changes filtered by RLS, presence, broadcast)
```

## Roles & permissions

| Role | Granted by | Enforced in |
|---|---|---|
| founder | default | RLS policies |
| mentor | creating a mentor profile (trigger) | `mentor_profiles`, `mentorship_requests` guards |
| moderator (global) / community moderator | admin | `is_community_moderator()` in RLS & guards |
| admin | admin | `is_admin()` in RLS, `admin_*` SECURITY DEFINER functions, server action re-checks |

Suspended users fail `is_active_user()`, so every write policy rejects them. Their profiles are hidden by RLS.

## Data model (main tables)

Profiles & identity: `profiles`, `skills`, `profile_skills` (has / learn), `profile_interests`, `categories`
Startups: `startups`, `startup_members`, `startup_milestones`
Communities: `communities`, `community_members`, `community_posts` (discussion / question / announcement / poll), `poll_options`, `poll_votes`, `comments`, `post_reactions`, `community_messages`
Networking: `connections`, `recommendations`, `conversations`, `conversation_participants`, `messages`, `endorsements`
Collaboration: `opportunities`, `opportunity_applications`, `skill_exchanges`, `events`, `event_registrations`, `mentor_profiles`, `mentorship_requests`, `mentorship_reviews`, `workspaces`, `workspace_members`, `workspace_tasks`, `workspace_milestones`, `workspace_posts`, `workspace_files`
Platform: `resources`, `saved_items`, `notifications`, `notification_preferences`, `reports`, `verification_requests`, `platform_settings`

Notifications are created by `AFTER` triggers through `notify()`, which respects each user's preferences. Mentions use the markup `@[Name](uuid)`. The composer inserts it and triggers extract it with `extract_mentions()`. Event reminders run every 10 minutes via `pg_cron` (`send_event_reminders()`).

Storage buckets: `avatars` and `startup-assets` are public, with writes limited to `<uid>/…`. `attachments` (`dm/<conversation>/…`, `community/<community>/…`) and `workspace-files` (`<workspace>/…`) are private, with membership checked in storage policies and files served via short-lived signed URLs.

## Matching engine (`src/lib/matching`)

`engine.ts` is pure and unit-tested. A score is the normalised sum of named scorers:

| Factor | Max | Signal |
|---|---|---|
| Covers what you need | 28 | your `looking_for` + startup `current_needs` ∩ their offers and skill capabilities |
| You can help them | 10 | the reverse direction |
| Complementary skills | 14 | their skills you lack, weighted when they map to your needs or what you want to learn |
| Industry fit | 14 | same startup category, or their interests include your industry |
| Shared interests | 10 | Jaccard overlap of interest categories |
| Stage compatibility | 8 | same or adjacent stage; experienced founders when you seek mentorship or fundraising |
| Co-founder intent | 7 | both seeking, with a technical/business split |
| Collaboration preferences | 5 | overlapping collaboration types, partnerships |
| Location | 4 | same city or country |

Each factor returns points plus a sentence. The engine also writes a human-readable summary ("Recommended because…") and a suggested collaboration. `service.ts` loads profile signals, ranks candidates and stores snapshots in `recommendations` (refreshed when stale or after profile edits, keeping dismissals). It also announces strong new matches. **Extending:** add a `Scorer` (for example, cosine similarity over pgvector embeddings) to `DEFAULT_SCORERS`. Scores renormalise automatically.

## AI assistant (`src/lib/ai`)

`/api/assistant` authenticates the user, rate-limits per user, builds a grounding context from live data (profile, startup, team-gap analysis, top matches with links, communities not joined, relevant opportunities, mentors, events) and streams from any OpenAI-compatible endpoint. The system prompt restricts recommendations to entities in the context. Keys live only on the server. The page also shows rule-based insights, clearly labelled as not AI.

## Real-time

- Messages and community chat: `postgres_changes` INSERT/DELETE per thread (RLS filters delivery), plus broadcast `typing` events.
- Presence: one `presence:online` channel feeds online dots and "active N minutes ago" (`last_seen_at`).
- Notification and unread-message badges: subscriptions in `RealtimeProvider`.
- Workspaces: task changes trigger a debounced refresh for all members.
