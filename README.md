# Cofoundry

A collaboration platform for startup founders: explainable founder matching, industry communities with real-time chat, an opportunities marketplace, messaging, private workspaces, mentorship, skill exchange, events, a resource library, an AI startup assistant and an admin console.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · Supabase (Postgres, Auth, Realtime, Storage) · Recharts · Vitest · Playwright

---

## Quick start (local)

Prerequisites: Node 20.9+ and Docker Desktop (running).

```bash
npm install
npm run db:start          # starts local Supabase on ports 55321-55329 (first run pulls images)
npm run seed:demo         # optional: demo founders, startups, posts, events (all labelled "Demo")
npm run dev               # http://localhost:3000
```

`.env.local` is preconfigured for the local stack (the Supabase CLI's standard local demo keys). Useful local URLs:

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| Supabase Studio (DB browser) | http://127.0.0.1:55323 |
| Mailpit (catches verification & reset emails) | http://127.0.0.1:55324 |

### Demo accounts (after `npm run seed:demo`)

All demo accounts use the password **`Cofoundry!demo1`**. Seeded profiles are flagged `is_demo` and show a "Demo" badge in the UI.

| Role | Email |
|---|---|
| Administrator | `admin@cofoundry.dev` |
| Founder (HealthTech, seeking a technical co-founder) | `maya@demo.cofoundry.dev` |
| Community moderator | `noah@demo.cofoundry.dev` |
| Mentor | `lucas@demo.cofoundry.dev` |
| Others | `daniel@`, `sofia@`, `arjun@`, `lena@`, `omar@`, `grace@`, `hana@`, `mateo@`, `priya@`, `tomas@`, `elena@`, `kenji@`, `amara@`, `zara@` `demo.cofoundry.dev` |

New sign-ups go through real email verification. Open Mailpit to click the link.

## Configuration

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (public; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Used solely for account deletion and the demo seed script |
| `NEXT_PUBLIC_SITE_URL` | Base URL used in auth emails |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` to show "Continue with Google" (also enable the provider in Supabase) |
| `AI_API_KEY` (or `GEMINI_API_KEY`), `AI_MODEL`, `AI_BASE_URL` | AI assistant. Defaults to **Google Gemini** (`gemini-2.5-flash` via Gemini's OpenAI-compatible endpoint); any OpenAI-compatible provider works by changing the base URL and model. If no key is set, the assistant clearly reports that it's not configured |

**Google sign-in:** create OAuth credentials in Google Cloud and add the redirect URI `<SUPABASE_URL>/auth/v1/callback`. Then enable the provider (`supabase/config.toml` → `[auth.external.google]` locally, or the Supabase dashboard in production) and set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

## Deploying

1. Create a Supabase project and link it: `npx supabase link --project-ref <ref>`, then `npx supabase db push` (applies `supabase/migrations`). Run `supabase/seed.sql` once for categories, communities, skills and the resource library. Do **not** run the demo seed in production; the script refuses non-local URLs.
2. In Supabase Auth settings, set the Site URL and add `https://<your-domain>/auth/callback` to the redirect allow-list. Configure SMTP for production email.
3. Enable `pg_cron` (Database → Extensions) for 24-hour event reminders. The migration schedules the job automatically when the extension is available.
4. Deploy the Next.js app (e.g. Vercel) with the environment variables above.

## Testing

```bash
npm test                 # unit tests: matching engine + AI streaming client (Vitest)
npm run test:fresh       # resets local DB, seeds demo data, runs 26 database security tests (RLS & triggers)
npm run test:e2e         # resets + seeds, then 15 browser journeys (requires `npm run dev`)
npm run typecheck && npm run lint
```

The e2e suite covers sign-up → email verification → 4-step onboarding → personalised matches, live DMs with typing indicators, posting/replies/polls, connections, workspaces, opportunity apply → accept, events, mentorship booking, verification review by an admin, role gating and search.

## Project layout

```
src/
  app/
    (auth)/            login, signup, password recovery
    (app)/             authenticated app (sidebar shell): dashboard, discover, communities,
                       messages, opportunities, startup, events, mentorship, skill-exchange,
                       resources, assistant, workspaces, network, notifications, saved,
                       search, settings, moderation, admin
    startups/[slug]    public startup pages
    api/assistant      streaming AI endpoint
  actions/             server actions (validated with zod, executed as the signed-in user)
  components/          shell, shared UI, chat, communities, network, ...
  lib/
    matching/          explainable matching engine + service
    ai/                OpenAI-compatible client + context builder
    queries/           reusable data loaders
supabase/
  migrations/          schema, RLS, triggers, storage, realtime, functions
  seed.sql             reference data (safe for production)
scripts/               demo seed, security tests, e2e tests, visit helper
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design details.
