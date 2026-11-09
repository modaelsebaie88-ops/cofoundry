#!/usr/bin/env node
/**
 * Seeds DEMO data for local development: founder accounts, startups, community
 * activity, opportunities, events, mentors and skill exchanges.
 *
 * Every seeded profile has is_demo = true and is labelled "Demo" in the UI.
 * All demo accounts share the password below. Do not run against production.
 *
 *   npm run seed:demo            # requires .env.local with SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
)
const url = env.NEXT_PUBLIC_SUPABASE_URL
if (!/127\.0\.0\.1|localhost/.test(url) && !process.argv.includes("--force")) {
  console.error(`Refusing to seed demo data into non-local Supabase (${url}). Pass --force to override.`)
  process.exit(1)
}
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PASSWORD = "Cofoundry!demo1"

const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  return res.data
}

// ---------------------------------------------------------------------------
const FOUNDERS = [
  { key: "admin", email: "admin@cofoundry.dev", name: "Ava Admin", role: "admin", headline: "Platform administrator", country: "United States", city: "San Francisco", founder_role: "COO", years: 12, bio: "Runs platform operations and trust & safety for Cofoundry.", skills: ["Operations", "Community building"], interests: ["saas", "consulting"], looking_for: [], offers: ["operations", "community"], cofounder: false },
  { key: "maya", email: "maya@demo.cofoundry.dev", name: "Maya Chen", headline: "Founder & CEO at Lumen Health · ex-clinic operator", country: "United States", city: "San Francisco", founder_role: "CEO", years: 9, bio: "Spent eight years running outpatient clinics and watched care teams drown in admin work. Building Lumen to give clinicians their time back.", skills: ["Operations", "B2B sales", "Product strategy", "User interviews"], learn: ["Machine learning"], interests: ["healthtech", "ai-ml", "saas"], looking_for: ["engineering", "data_ai", "fundraising"], offers: ["sales", "operations", "product"], cofounder: true, partnerships: true, collab: ["cofounder", "advisory"], availability: "full_time",
    startup: { name: "Lumen Health", slug: "lumen-health", cat: "healthtech", stage: "mvp", tagline: "AI documentation assistant for outpatient clinics", description: "Lumen listens to clinical visits (with consent) and drafts structured notes, codes and follow-ups so clinicians spend time with patients, not paperwork.", target: "Independent outpatient clinics in the US", model: "Per-clinician SaaS subscription", team: 2, needs: ["engineering", "data_ai"], mission: "Give every clinician two extra hours a day for patients.", vision: "Administrative work that disappears into the background of care.", products: "Ambient note drafting, coding suggestions, follow-up task generation.", location: "San Francisco, CA", founded: 2025 } },
  { key: "daniel", email: "daniel@demo.cofoundry.dev", name: "Daniel Okafor", headline: "Full-stack engineer · built 3 SaaS products from zero", country: "United States", city: "Austin", founder_role: "Technical founder", years: 8, bio: "Engineer who loves the zero-to-one phase. Previously first engineer at two B2B SaaS startups (one acquired). Looking for a domain expert to build with.", skills: ["Full-stack development", "TypeScript", "Next.js", "Node.js", "Cloud architecture", "LLM applications"], learn: ["B2B sales", "Fundraising"], interests: ["saas", "ai-ml", "healthtech"], looking_for: ["sales", "business_development", "fundraising"], offers: ["engineering", "data_ai", "product"], cofounder: true, partnerships: true, collab: ["cofounder", "part_time", "skill_exchange"], availability: "part_time" },
  { key: "sofia", email: "sofia@demo.cofoundry.dev", name: "Sofia Rossi", headline: "Growth marketer · 0→100k users for two consumer apps", country: "Italy", city: "Milan", founder_role: "CMO", years: 7, bio: "Growth and brand marketer. I help early teams find their first repeatable acquisition channel.", skills: ["Growth marketing", "SEO", "Content marketing", "Performance marketing", "Brand strategy"], learn: ["Analytics", "LLM applications"], interests: ["ecommerce", "marketing", "saas", "edtech"], looking_for: ["engineering", "data_ai"], offers: ["marketing", "content"], cofounder: false, partnerships: true, collab: ["freelance", "advisory", "skill_exchange"], availability: "part_time",
    startup: { name: "Brightcart", slug: "brightcart", cat: "ecommerce", stage: "early_traction", tagline: "Personalised storefronts for independent fashion brands", description: "Brightcart turns a brand's catalogue into personalised storefront experiences that lift conversion for small DTC fashion labels.", target: "Independent DTC fashion brands in Europe", model: "Revenue share + monthly platform fee", team: 4, needs: ["engineering", "data_ai", "fundraising"], location: "Milan, Italy", founded: 2024 } },
  { key: "arjun", email: "arjun@demo.cofoundry.dev", name: "Arjun Mehta", headline: "ML engineer · computer vision & LLM systems", country: "India", city: "Bengaluru", founder_role: "CTO", years: 6, bio: "Building practical ML systems. Previously led a computer vision team for retail analytics.", skills: ["Machine learning", "Computer vision", "Python", "LLM applications", "Data engineering"], learn: ["Go-to-market strategy", "Pitching"], interests: ["ai-ml", "hardware", "climate"], looking_for: ["business_development", "marketing", "fundraising"], offers: ["data_ai", "engineering"], cofounder: true, partnerships: false, collab: ["cofounder", "skill_exchange"], availability: "full_time",
    startup: { name: "Verdant Vision", slug: "verdant-vision", cat: "climate", stage: "idea", tagline: "Satellite + drone imagery to verify reforestation projects", description: "Verdant Vision uses computer vision on satellite and drone imagery to independently verify tree survival in carbon removal projects.", target: "Carbon credit registries and reforestation developers", model: "Per-hectare monitoring subscription", team: 1, needs: ["business_development", "fundraising"], location: "Bengaluru, India", founded: 2026 } },
  { key: "lena", email: "lena@demo.cofoundry.dev", name: "Lena Fischer", headline: "Product designer · design systems & B2B UX", country: "Germany", city: "Berlin", founder_role: "Designer", years: 10, bio: "Product designer who has shipped design systems for fintech and SaaS companies. Happy to help founders make complex products feel simple.", skills: ["Product design", "UX research", "Design systems", "UI design"], learn: ["Frontend development"], interests: ["fintech", "saas", "climate"], looking_for: ["engineering"], offers: ["design", "product"], cofounder: false, partnerships: true, collab: ["freelance", "advisory", "skill_exchange"], availability: "few_hours_week" },
  { key: "omar", email: "omar@demo.cofoundry.dev", name: "Omar Haddad", headline: "Fintech founder · payments infrastructure for SMEs in MENA", country: "United Arab Emirates", city: "Dubai", founder_role: "CEO", years: 11, bio: "Former banker turned founder. Building payment rails that let small businesses in the Gulf get paid faster.", skills: ["Fundraising", "Financial modeling", "Partnerships", "Enterprise sales"], learn: ["Product design"], interests: ["fintech", "web3", "saas"], looking_for: ["engineering", "design", "legal"], offers: ["fundraising", "sales", "business_development"], cofounder: false, partnerships: true, collab: ["full_time", "partnership", "advisory"], availability: "full_time",
    startup: { name: "Rafiq Pay", slug: "rafiq-pay", cat: "fintech", stage: "growth", tagline: "Instant payouts and invoicing for SMEs across the Gulf", description: "Rafiq Pay gives small and medium businesses instant settlement, smart invoicing and multi-currency collections through a single API and dashboard.", target: "SMEs in the GCC", model: "Transaction fees + premium plans", team: 24, needs: ["engineering", "design", "legal"], location: "Dubai, UAE", founded: 2022 } },
  { key: "grace", email: "grace@demo.cofoundry.dev", name: "Grace Mensah", headline: "EdTech founder · skills training for African developers", country: "Ghana", city: "Accra", founder_role: "CEO", years: 6, bio: "Teacher turned founder. Building cohort-based bootcamps that connect graduates directly with remote employers.", skills: ["Community building", "Operations", "Content marketing"], learn: ["Fundraising", "Financial modeling"], interests: ["edtech", "saas", "consulting"], looking_for: ["fundraising", "engineering", "mentorship"], offers: ["community", "content", "operations"], cofounder: false, partnerships: true, collab: ["partnership", "advisory"], availability: "full_time",
    startup: { name: "CodeBridge Academy", slug: "codebridge-academy", cat: "edtech", stage: "early_traction", tagline: "Cohort bootcamps that place African developers in remote roles", description: "CodeBridge runs 16-week cohort programs with employer partners who co-design the curriculum and interview graduates.", target: "Aspiring developers in West Africa; remote-first employers", model: "Employer placement fees + income share", team: 7, needs: ["fundraising", "engineering"], location: "Accra, Ghana", founded: 2023 } },
  { key: "lucas", email: "lucas@demo.cofoundry.dev", name: "Lucas Martin", headline: "Serial founder & angel · 2 exits in B2B SaaS", country: "France", city: "Paris", founder_role: "CEO", years: 18, bio: "Founded two B2B SaaS companies (acquired 2017 and 2022). Now angel investing and mentoring first-time founders on go-to-market and fundraising.", skills: ["Fundraising", "Go-to-market strategy", "Enterprise sales", "Angel investing", "Founder coaching"], learn: [], interests: ["saas", "ai-ml", "fintech", "cybersecurity"], looking_for: [], offers: ["mentorship", "fundraising", "investment", "sales"], cofounder: false, partnerships: false, collab: ["advisory", "investment"], availability: "few_hours_week", mentor: { expertise: ["Fundraising", "B2B go-to-market", "Enterprise sales", "Hiring your first team"], stages: ["mvp", "early_traction", "growth"], about: "Two-time B2B SaaS founder. I help founders build a fundraising process and a repeatable sales motion. Bring your deck or your pipeline.", note: "Tuesdays and Thursdays, European afternoons", minutes: 45, per_month: 6 } },
  { key: "hana", email: "hana@demo.cofoundry.dev", name: "Hana Kim", headline: "Security engineer · building privacy tooling for startups", country: "South Korea", city: "Seoul", founder_role: "CTO", years: 9, bio: "Security engineer (ex-big tech red team). Building automated compliance tooling so startups can pass security reviews without a dedicated team.", skills: ["Security engineering", "Go", "Cloud architecture", "DevOps", "Legal & compliance"], learn: ["Product marketing"], interests: ["cybersecurity", "saas", "ai-ml"], looking_for: ["sales", "marketing"], offers: ["engineering", "legal"], cofounder: true, partnerships: true, collab: ["cofounder", "advisory"], availability: "full_time",
    startup: { name: "Shieldkit", slug: "shieldkit", cat: "cybersecurity", stage: "mvp", tagline: "SOC 2 readiness on autopilot for seed-stage startups", description: "Shieldkit connects to your cloud and code tools, maps controls automatically and generates the evidence auditors ask for.", target: "Seed and Series A B2B startups", model: "Annual SaaS subscription", team: 2, needs: ["sales", "marketing"], location: "Seoul, South Korea", founded: 2025 } },
  { key: "mateo", email: "mateo@demo.cofoundry.dev", name: "Mateo García", headline: "Game developer · indie studio founder", country: "Spain", city: "Barcelona", founder_role: "Solo founder", years: 5, bio: "Indie game developer working on a cozy co-op building game. Looking for an artist and someone who understands community-led marketing.", skills: ["Game development", "Rust", "Motion design"], learn: ["Community building", "Performance marketing"], interests: ["gaming", "web3"], looking_for: ["design", "marketing", "community"], offers: ["engineering"], cofounder: true, partnerships: false, collab: ["cofounder", "part_time"], availability: "weekends",
    startup: { name: "Hearthwood Games", slug: "hearthwood-games", cat: "gaming", stage: "mvp", tagline: "Cozy co-op building games for friends", description: "An indie studio crafting relaxing multiplayer games. Our first title lets up to four friends build a village together across the seasons.", target: "Cozy game players on PC and Switch", model: "Premium game sales + DLC", team: 1, needs: ["design", "marketing", "community"], location: "Barcelona, Spain", founded: 2025 } },
  { key: "priya", email: "priya@demo.cofoundry.dev", name: "Priya Nair", headline: "Product manager → founder · B2B workflow tools", country: "United Kingdom", city: "London", founder_role: "CPO", years: 8, bio: "PM for seven years at fintech scale-ups. Now exploring an idea for automated vendor onboarding and looking for a technical partner.", skills: ["Product management", "Roadmapping", "User interviews", "Analytics"], learn: ["Full-stack development"], interests: ["fintech", "saas", "consulting"], looking_for: ["engineering", "design"], offers: ["product", "operations"], cofounder: true, partnerships: true, collab: ["cofounder", "skill_exchange"], availability: "part_time",
    startup: { name: "Onboardly", slug: "onboardly", cat: "saas", stage: "idea", tagline: "Vendor onboarding without the email chaos", description: "Onboardly collects vendor documents, runs compliance checks and syncs approved suppliers into finance systems automatically.", target: "Mid-market finance and procurement teams", model: "Seat-based SaaS", team: 1, needs: ["engineering", "design"], location: "London, UK", founded: 2026 } },
  { key: "tomas", email: "tomas@demo.cofoundry.dev", name: "Tomás Silva", headline: "Hardware engineer · robotics for small farms", country: "Brazil", city: "São Paulo", founder_role: "CTO", years: 7, bio: "Mechatronics engineer building affordable weeding robots for small and medium farms.", skills: ["Embedded systems", "Industrial design", "Python", "Computer vision"], learn: ["Fundraising", "Supply chain"], interests: ["hardware", "climate", "ai-ml"], looking_for: ["fundraising", "operations", "business_development"], offers: ["engineering", "data_ai", "design"], cofounder: true, partnerships: true, collab: ["cofounder", "partnership"], availability: "full_time",
    startup: { name: "Agrobot Labs", slug: "agrobot-labs", cat: "hardware", stage: "mvp", tagline: "Autonomous weeding robots for small farms", description: "Solar-powered robots that identify and remove weeds mechanically, cutting herbicide use for farms under 200 hectares.", target: "Small and mid-size vegetable farms in Latin America", model: "Robot-as-a-service per season", team: 3, needs: ["fundraising", "operations"], location: "São Paulo, Brazil", founded: 2024 } },
  { key: "elena", email: "elena@demo.cofoundry.dev", name: "Elena Petrova", headline: "Startup lawyer · helping founders with contracts, IP and fundraising docs", country: "Germany", city: "Berlin", founder_role: "Business founder", years: 13, bio: "Corporate lawyer specialised in early-stage startups. Happy to help founders understand term sheets, co-founder agreements and IP basics.", skills: ["Legal & compliance", "Contracts", "IP & patents", "Fundraising"], learn: ["Product management"], interests: ["saas", "fintech", "consulting"], looking_for: ["marketing"], offers: ["legal", "mentorship", "fundraising"], cofounder: false, partnerships: true, collab: ["advisory", "freelance"], availability: "few_hours_week", mentor: { expertise: ["Co-founder agreements", "Term sheets", "IP protection", "Contracts"], stages: ["idea", "mvp", "early_traction"], about: "Startup lawyer. I help founders understand the legal decisions that matter early, so they can talk to their own counsel with confidence. Not legal advice.", note: "Wednesday mornings CET", minutes: 30, per_month: 8 } },
  { key: "kenji", email: "kenji@demo.cofoundry.dev", name: "Kenji Watanabe", headline: "Web3 engineer · smart contracts & wallets", country: "Japan", city: "Tokyo", founder_role: "Engineer", years: 6, bio: "Smart contract engineer exploring real-world asset tokenisation. Interested in partnerships with fintech founders.", skills: ["Smart contracts", "Rust", "TypeScript", "Security engineering"], learn: ["Brand strategy"], interests: ["web3", "fintech"], looking_for: ["business_development", "marketing", "legal"], offers: ["engineering"], cofounder: true, partnerships: true, collab: ["cofounder", "freelance", "partnership"], availability: "part_time" },
  { key: "amara", email: "amara@demo.cofoundry.dev", name: "Amara Johnson", headline: "Sales leader · first sales hire at 3 SaaS startups", country: "United States", city: "New York", founder_role: "Business founder", years: 10, bio: "Built and led sales teams from first deal to $10M ARR. Now advising founders on founder-led sales and looking for my own technical co-founder.", skills: ["B2B sales", "Enterprise sales", "Sales operations", "Customer success", "Go-to-market strategy"], learn: ["LLM applications"], interests: ["saas", "ai-ml", "cybersecurity", "healthtech"], looking_for: ["engineering", "data_ai", "product"], offers: ["sales", "business_development", "mentorship"], cofounder: true, partnerships: true, collab: ["cofounder", "advisory"], availability: "full_time", mentor: { expertise: ["Founder-led sales", "Pricing", "Sales hiring", "Enterprise deals"], stages: ["mvp", "early_traction"], about: "I've been the first sales hire three times. Let's work on your outbound, discovery calls, pricing or first sales hire.", note: "Mondays, US Eastern", minutes: 45, per_month: 4 } },
  { key: "noah", email: "noah@demo.cofoundry.dev", name: "Noah Williams", headline: "Community moderator · founder community builder", role: "moderator", country: "Canada", city: "Toronto", founder_role: "COO", years: 8, bio: "Community builder who has run founder communities for accelerators. Moderating Cofoundry communities.", skills: ["Community building", "Developer relations", "Content marketing"], learn: ["Data science"], interests: ["saas", "ai-ml", "edtech"], looking_for: ["data_ai"], offers: ["community", "content", "marketing"], cofounder: false, partnerships: true, collab: ["advisory", "partnership"], availability: "part_time" },
  { key: "zara", email: "zara@demo.cofoundry.dev", name: "Zara Ahmed", headline: "Data scientist · climate risk analytics", country: "United Kingdom", city: "London", founder_role: "Technical founder", years: 5, bio: "Data scientist modelling physical climate risk for insurers. Considering starting a company around flood risk data for SMEs.", skills: ["Data science", "Machine learning", "Python", "Analytics"], learn: ["Go-to-market strategy"], interests: ["climate", "fintech", "ai-ml"], looking_for: ["business_development", "sales", "fundraising"], offers: ["data_ai", "engineering"], cofounder: true, partnerships: false, collab: ["cofounder", "skill_exchange"], availability: "weekends" },
]

const day = 24 * 3600 * 1000
const inDays = (d, h = 17) => { const t = new Date(Date.now() + d * day); t.setUTCHours(h, 0, 0, 0); return t.toISOString() }
const ago = (d) => new Date(Date.now() - d * day).toISOString()

async function main() {
  console.log("Seeding demo data into", url)
  const { data: cats } = await db.from("categories").select("id, slug")
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]))
  const { data: comms } = await db.from("communities").select("id, slug, category_id")
  const commId = Object.fromEntries(comms.map((c) => [c.slug, c.id]))
  const { data: skills } = await db.from("skills").select("id, name")
  const skillId = Object.fromEntries(skills.map((s) => [s.name.toLowerCase(), s.id]))

  // --- users -------------------------------------------------------------
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 })
  const ids = {}
  for (const f of FOUNDERS) {
    const found = existing.users.find((u) => u.email === f.email)
    if (found) { ids[f.key] = found.id; continue }
    const u = must(await db.auth.admin.createUser({ email: f.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: f.name } }), `create ${f.email}`)
    ids[f.key] = u.user.id
  }
  console.log(`✓ ${FOUNDERS.length} demo accounts`)

  for (const f of FOUNDERS) {
    const id = ids[f.key]
    must(await db.from("profiles").update({
      full_name: f.name, headline: f.headline, bio: f.bio, country: f.country, city: f.city,
      founder_role: f.founder_role, years_experience: f.years, role: f.role ?? "founder",
      looking_for: f.looking_for, offers: f.offers, seeking_cofounder: f.cofounder,
      open_to_partnerships: f.partnerships ?? false, collaboration_types: f.collab ?? [],
      availability: f.availability ?? "part_time", help_topics: f.offers.slice(0, 3),
      linkedin_url: `https://www.linkedin.com/in/demo-${f.key}`, onboarding_completed: true, is_demo: true,
      is_verified: ["lucas", "omar"].includes(f.key), last_seen_at: ago(Math.random() * 3),
      previous_experience: f.bio,
    }).eq("id", id), `profile ${f.key}`)
    await db.from("profile_skills").delete().eq("profile_id", id)
    const rows = [
      ...f.skills.map((s) => ({ profile_id: id, skill_id: skillId[s.toLowerCase()], kind: "has" })),
      ...(f.learn ?? []).map((s) => ({ profile_id: id, skill_id: skillId[s.toLowerCase()], kind: "learn" })),
    ].filter((r) => r.skill_id)
    if (rows.length) must(await db.from("profile_skills").insert(rows), `skills ${f.key}`)
    await db.from("profile_interests").delete().eq("profile_id", id)
    must(await db.from("profile_interests").insert(f.interests.map((s) => ({ profile_id: id, category_id: catId[s] }))), `interests ${f.key}`)

    if (f.startup) {
      const s = f.startup
      must(await db.from("startups").upsert({
        owner_id: id, name: s.name, slug: s.slug, tagline: s.tagline, description: s.description,
        category_id: catId[s.cat], stage: s.stage, target_market: s.target, business_model: s.model,
        team_size: s.team, current_needs: s.needs, mission: s.mission ?? null, vision: s.vision ?? null,
        products: s.products ?? null, location: s.location, founded_year: s.founded,
        website_url: `https://${s.slug}.example.com`, is_verified: f.key === "omar",
      }, { onConflict: "owner_id" }), `startup ${f.key}`)
    }
    if (f.mentor) {
      const m = f.mentor
      must(await db.from("mentor_profiles").upsert({
        profile_id: id, expertise: m.expertise, focus_stages: m.stages, about: m.about,
        availability_note: m.note, session_minutes: m.minutes, sessions_per_month: m.per_month,
      }), `mentor ${f.key}`)
      if (!f.role) await db.from("profiles").update({ role: "mentor" }).eq("id", id)
    }
    // community memberships from interests
    const memberships = f.interests.map((slug) => ({ community_id: commId[slug], profile_id: id, role: f.role === "moderator" ? "moderator" : "member" }))
    await db.from("community_members").upsert(memberships, { onConflict: "community_id,profile_id", ignoreDuplicates: true })
  }
  console.log("✓ profiles, skills, interests, startups, mentors, memberships")

  const { data: startups } = await db.from("startups").select("id, owner_id, slug")
  const startupOf = Object.fromEntries(startups.map((s) => [s.owner_id, s.id]))
  const { data: s1 } = await db.from("startups").select("id").eq("slug", "lumen-health").single()
  must(await db.from("startup_milestones").delete().eq("startup_id", s1.id), "clear milestones")
  must(await db.from("startup_milestones").insert([
    { startup_id: s1.id, title: "Signed first two pilot clinics", achieved_on: ago(40).slice(0, 10), description: "Letters of intent from two independent clinics in the Bay Area." },
    { startup_id: s1.id, title: "Clickable prototype validated with 18 clinicians", achieved_on: ago(90).slice(0, 10) },
  ]), "milestones")

  // --- only seed activity once ------------------------------------------
  const { count } = await db.from("community_posts").select("id", { count: "exact", head: true })
  if (count && count > 0) { console.log("Activity already seeded — skipping posts/opportunities/events."); return done(ids) }

  // --- posts, comments, polls ----------------------------------------------
  const post = async (author, comm, type, title, body, extra = {}) =>
    must(await db.from("community_posts").insert({ author_id: ids[author], community_id: commId[comm], type, title, body, created_at: extra.at ?? ago(Math.random() * 10), is_pinned: extra.pinned ?? false }).select("id").single(), `post ${title}`).id
  const comment = async (author, postId, body) => must(await db.from("comments").insert({ author_id: ids[author], post_id: postId, body }).select("id").single(), "comment").id

  const p1 = await post("maya", "healthtech", "question", "How did you get your first clinic pilots to say yes?", "We have two LOIs but converting them into paid pilots is slow. Procurement asks for security docs we don't have yet. How did other health founders handle this at MVP stage?", { at: ago(2) })
  const c1 = await comment("hana", p1, "Put together a lightweight security packet: data flow diagram, encryption at rest/in transit, access controls and a vendor questionnaire answered once. It removes most of the friction before you have SOC 2.")
  await comment("amara", p1, "Ask your champion who else needs to sign off and meet them early. Most slow pilots stall on an unidentified stakeholder, not on the product.")
  await db.from("community_posts").update({ accepted_comment_id: c1 }).eq("id", p1)
  const p2 = await post("lucas", "saas", "discussion", "What I'd do differently raising a pre-seed in 2026", "After two companies and a lot of angel cheques, my top three lessons: 1) Run a compressed process — 3 weeks of first meetings. 2) Lead with the customer pull you have, not the TAM slide. 3) Send short monthly updates to everyone who passed. Happy to answer questions here.", { at: ago(1) })
  await comment("priya", p2, "How compressed is too compressed if you're still pre-product?")
  await comment("lucas", p2, "Pre-product, spend more time on the 'why you' and evidence from customer interviews. Same process length, but expect more angels than funds.")
  await comment("daniel", p2, "The monthly update tip is underrated. Two of my former company's investors came from updates sent to people who passed.")
  const p3 = await post("noah", "ai-ml", "announcement", "Welcome to the AI & Machine Learning community 👋", "Introduce yourself below: what you're building, what you need help with and what you can offer. Use the Opportunities marketplace for hiring and co-founder searches so this feed stays focused on knowledge sharing.", { pinned: true, at: ago(9) })
  await comment("arjun", p3, "Hi all — building Verdant Vision (CV for reforestation verification). Looking for someone strong in carbon markets BD.")
  await comment("zara", p3, "Data scientist working on climate risk. Happy to swap notes with anyone doing geospatial ML.")
  const poll = await post("sofia", "marketing", "poll", "Which acquisition channel worked best for your first 100 customers?", "Curious how this differs between B2B and B2C founders here.", { at: ago(3) })
  const opts = must(await db.from("poll_options").insert(["Founder-led outbound", "Communities & word of mouth", "Content / SEO", "Paid ads"].map((label, i) => ({ post_id: poll, label, position: i }))).select("id"), "poll options")
  for (const [k, i] of [["daniel", 0], ["amara", 0], ["grace", 1], ["noah", 1], ["mateo", 1], ["sofia", 2]]) {
    await db.from("community_members").upsert({ community_id: commId.marketing, profile_id: ids[k] }, { ignoreDuplicates: true, onConflict: "community_id,profile_id" })
    await db.from("poll_votes").insert({ post_id: poll, option_id: opts[i].id, voter_id: ids[k] })
  }
  await post("omar", "fintech", "discussion", "Licensing vs partnering with a sponsor bank — what's your experience?", "We launched by partnering with a licensed institution, but as volumes grow we're weighing our own license. Anyone gone through this in the Gulf or EU?", { at: ago(4) })
  await post("hana", "cybersecurity", "question", "Minimum security bar before your first enterprise customer?", "Beyond SSO and encryption, what did your first enterprise customers actually require? Trying to prioritise our roadmap.", { at: ago(5) })
  await post("grace", "edtech", "discussion", "Income share agreements: still viable for bootcamps?", "We're rethinking our financing model. ISAs had a rough reputation — has anyone found a fair structure students and employers like?", { at: ago(6) })
  await post("mateo", "gaming", "question", "Building a wishlist audience before launch — what worked?", "Steam wishlists are our main KPI. Short-form video vs Discord community vs festivals — where should a solo dev focus?", { at: ago(2.5) })
  for (const [k, pid] of [["daniel", p2], ["sofia", p2], ["priya", p2], ["maya", p2], ["amara", p1], ["lucas", p1], ["zara", p3]]) {
    await db.from("post_reactions").insert({ post_id: pid, profile_id: ids[k] })
  }
  // community chat
  const chat = [["noah", "Morning everyone! Reminder: AMA with Lucas on fundraising is on Thursday."], ["arjun", "Anyone tried fine-tuning small vision models on drone imagery? Looking for dataset tips."], ["zara", "@[Arjun Mehta](" + ids.arjun + ") check out open land-cover datasets first, then label a few hundred of your own tiles."], ["daniel", "Shipping an LLM eval harness this week — happy to share the setup if useful."]]
  for (const [i, [k, body]] of chat.entries()) {
    await db.from("community_messages").insert({ community_id: commId["ai-ml"], sender_id: ids[k], body, created_at: new Date(Date.now() - (chat.length - i) * 3600e3).toISOString() })
  }
  console.log("✓ community posts, comments, polls, chat")

  // --- opportunities -----------------------------------------------------------
  const opp = (author, o) => ({ author_id: ids[author], startup_id: startupOf[ids[author]] ?? null, is_remote: true, ...o })
  must(await db.from("opportunities").insert([
    opp("maya", { type: "cofounder", title: "Technical co-founder (AI/ML) for clinical documentation startup", description: "Lumen Health has two pilot clinics lined up and a validated prototype. I'm looking for a technical co-founder to own the product architecture — speech-to-text pipeline, LLM note generation and EHR integrations. You'll work directly with clinicians from week one.", required_skills: ["LLM applications", "Full-stack development", "Python"], category_id: catId.healthtech, stage: "mvp", collaboration_type: "cofounder", requirements: "Experience shipping production software; interest in healthcare; comfortable with meaningful equity (10–25% depending on commitment).", location: "San Francisco or remote (US time zones)" }),
    opp("hana", { type: "marketing", title: "Fractional growth marketer for a B2B security product", description: "Shieldkit helps seed-stage startups reach SOC 2 readiness. We need help building our first content engine and outbound playbook aimed at technical founders.", required_skills: ["Content marketing", "Product marketing", "SEO"], category_id: catId.cybersecurity, stage: "mvp", collaboration_type: "part_time", requirements: "B2B SaaS marketing experience; ideally you've marketed to developers before." }),
    opp("omar", { type: "designer", title: "Senior product designer for merchant dashboard", description: "Rafiq Pay is redesigning its merchant dashboard used by 3,000+ SMEs. Join our 24-person team to own the design of invoicing, payouts and reconciliation flows.", required_skills: ["Product design", "Design systems", "UX research"], category_id: catId.fintech, stage: "growth", collaboration_type: "full_time", requirements: "5+ years of product design; fintech or B2B dashboard experience preferred.", location: "Dubai (hybrid) or remote in GMT+4 ±3", is_remote: true }),
    opp("mateo", { type: "designer", title: "2D artist to join a cozy co-op game as co-founder", description: "Hearthwood Games has a playable prototype of a cozy village-building co-op game. Looking for a 2D artist who wants to shape the art direction and share in the upside.", required_skills: ["UI design", "Motion design", "Brand design"], category_id: catId.gaming, stage: "mvp", collaboration_type: "cofounder", requirements: "Portfolio of stylised 2D art; ~15 hours/week to start." }),
    opp("grace", { type: "investor", title: "Raising pre-seed for CodeBridge Academy", description: "We've placed 64 graduates in remote developer roles with 11 employer partners. Raising a pre-seed round to expand to two new cities and build our placement platform.", required_skills: [], category_id: catId.edtech, stage: "early_traction", collaboration_type: "investment", requirements: "Angels and funds focused on edtech, future of work or African tech." }),
    opp("lena", { type: "services_offered", title: "Design system audits for early-stage SaaS (skill exchange welcome)", description: "I'll review your product's UI, identify inconsistencies and set up a lean design system your engineers can actually use. Happy to trade for frontend engineering help on a side project.", required_skills: [], category_id: catId.saas, collaboration_type: "skill_exchange", requirements: "A live product or high-fidelity designs." }),
    opp("tomas", { type: "business_partner", title: "Operations & supply chain partner for agri-robotics", description: "Agrobot Labs has field-tested prototypes on three farms. We need a partner who can own manufacturing partners, supply chain and field operations as we prepare a 20-unit pilot.", required_skills: ["Operations", "Supply chain"], category_id: catId.hardware, stage: "mvp", collaboration_type: "cofounder", location: "São Paulo, Brazil", is_remote: false }),
    opp("priya", { type: "developer", title: "Full-stack developer to build an MVP (equity + stipend)", description: "Onboardly is validated with 14 finance-team interviews and 3 design partners. I need a full-stack developer to build the first version over 8–10 weeks.", required_skills: ["Full-stack development", "TypeScript", "React"], category_id: catId.saas, stage: "idea", collaboration_type: "part_time", requirements: "Comfortable owning architecture decisions; experience with integrations (accounting/ERP APIs a plus)." }),
  ]), "opportunities")
  console.log("✓ opportunities")

  // --- events -----------------------------------------------------------
  const events = must(await db.from("events").insert([
    { organizer_id: ids.lucas, community_id: commId.saas, title: "AMA: Raising your pre-seed round in 2026", description: "Live Q&A with Lucas Martin (2 exits, angel investor) on building a fundraising pipeline, running a compressed process and what investors look for at pre-seed.", type: "webinar", starts_at: inDays(3), ends_at: inDays(3, 18), is_online: true, meeting_url: "https://meet.example.com/cofoundry-ama", capacity: 200 },
    { organizer_id: ids.noah, community_id: commId["ai-ml"], title: "AI Builders Hack Weekend", description: "A 48-hour online hackathon for founders and engineers building with LLMs and computer vision. Form teams, ship a prototype, demo on Sunday evening.", type: "hackathon", starts_at: inDays(12, 9), ends_at: inDays(14, 19), is_online: true, meeting_url: "https://meet.example.com/ai-hack", capacity: 150 },
    { organizer_id: ids.sofia, community_id: commId.ecommerce, title: "Milan Founders Breakfast", description: "Informal breakfast meetup for founders in Milan — e-commerce, consumer and marketing founders especially welcome.", type: "meetup", starts_at: inDays(6, 8), ends_at: inDays(6, 10), is_online: false, location: "Milan, Italy — venue shared with registrants", capacity: 25 },
    { organizer_id: ids.amara, title: "Workshop: Founder-led sales for technical founders", description: "A hands-on workshop on writing outbound messages, running discovery calls and building a simple pipeline. Bring your ICP and a list of 20 target accounts.", type: "workshop", starts_at: inDays(8), ends_at: inDays(8, 19), is_online: true, meeting_url: "https://meet.example.com/sales-workshop", capacity: 60 },
    { organizer_id: ids.omar, community_id: commId.fintech, title: "FinTech Pitch Night", description: "Five early-stage fintech founders pitch to a panel of operators and angels. Applications to pitch open to Cofoundry members.", type: "pitch", starts_at: inDays(20), ends_at: inDays(20, 20), is_online: true, meeting_url: "https://meet.example.com/fintech-pitch" },
  ]).select("id, organizer_id"), "events")
  for (const k of ["maya", "daniel", "priya", "grace", "hana", "zara", "arjun"]) {
    await db.from("event_registrations").insert({ event_id: events[0].id, profile_id: ids[k] })
  }
  for (const k of ["arjun", "daniel", "zara"]) await db.from("event_registrations").insert({ event_id: events[1].id, profile_id: ids[k] })
  console.log("✓ events & registrations")

  // --- skill exchanges -----------------------------------------------------
  must(await db.from("skill_exchanges").insert([
    { author_id: ids.daniel, title: "Engineering help in exchange for sales coaching", offer_skills: ["Full-stack development", "Next.js", "LLM applications"], want_skills: ["B2B sales", "Pitching"], description: "I can review your architecture or help ship a feature. Looking for someone to pressure-test my sales approach for a side project.", format: "calls" },
    { author_id: ids.lena, title: "Design reviews for frontend pairing", offer_skills: ["Product design", "Design systems"], want_skills: ["Frontend development", "React"], description: "Weekly design critique for your product in exchange for pairing sessions on React.", format: "pairing" },
    { author_id: ids.arjun, title: "ML consulting for go-to-market advice", offer_skills: ["Machine learning", "Computer vision"], want_skills: ["Go-to-market strategy", "Pitching"], format: "any" },
    { author_id: ids.sofia, title: "Growth strategy for analytics help", offer_skills: ["Growth marketing", "SEO"], want_skills: ["Analytics", "LLM applications"], description: "I'll audit your acquisition funnel; you help me set up proper analytics for Brightcart.", format: "async" },
  ]), "skill exchanges")

  // --- connections & a DM --------------------------------------------------------
  must(await db.from("connections").insert([
    { requester_id: ids.maya, addressee_id: ids.lucas, status: "accepted", responded_at: ago(5) },
    { requester_id: ids.daniel, addressee_id: ids.amara, status: "accepted", responded_at: ago(3) },
    { requester_id: ids.priya, addressee_id: ids.lena, status: "accepted", responded_at: ago(2) },
    { requester_id: ids.hana, addressee_id: ids.maya, status: "pending", message: "Saw your question about clinic security reviews — happy to help." },
  ]), "connections")
  const conv = must(await db.from("conversations").insert({ is_group: false, dm_key: [ids.maya, ids.lucas].sort().join(":"), created_by: ids.maya }).select("id").single(), "dm")
  await db.from("conversation_participants").insert([{ conversation_id: conv.id, profile_id: ids.maya }, { conversation_id: conv.id, profile_id: ids.lucas }])
  await db.from("messages").insert([
    { conversation_id: conv.id, sender_id: ids.maya, body: "Hi Lucas — thanks for connecting. Would love your take on whether we should raise before or after converting our pilots.", created_at: ago(1.2) },
    { conversation_id: conv.id, sender_id: ids.lucas, body: "Convert at least one pilot to paid first. It changes the conversation completely. Happy to look at your deck this week.", created_at: ago(1.1) },
  ])
  console.log("✓ skill exchanges, connections, messages")
  done(ids)
}

function done() {
  console.log("\nDemo data ready. All demo accounts use the password:", PASSWORD)
  console.log("  Admin:     admin@cofoundry.dev")
  console.log("  Founder:   maya@demo.cofoundry.dev  (HealthTech, needs a technical co-founder)")
  console.log("  Moderator: noah@demo.cofoundry.dev")
}

main().catch((e) => { console.error(e); process.exit(1) })
