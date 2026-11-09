#!/usr/bin/env node
/**
 * Integration tests for database security & business rules. Signs in as real
 * demo users with the public anon key (exactly like the browser) and asserts
 * RLS policies and guard triggers behave correctly.
 *
 *   npm run seed:demo && npm run test:security
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
)
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const PASSWORD = "Cofoundry!demo1"
const service = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function as(email) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`sign in ${email}: ${error.message}`)
  c.uid = data.user.id
  return c
}

let passed = 0, failed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`) }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

const maya = await as("maya@demo.cofoundry.dev")
const daniel = await as("daniel@demo.cofoundry.dev")
const lucas = await as("lucas@demo.cofoundry.dev")
const noah = await as("noah@demo.cofoundry.dev")
const admin = await as("admin@cofoundry.dev")
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })

console.log("\nProfiles & roles")
await test("users cannot escalate their own role", async () => {
  const { error } = await maya.from("profiles").update({ role: "admin" }).eq("id", maya.uid)
  assert(error, "expected an error")
})
await test("users cannot self-verify", async () => {
  const { error } = await maya.from("profiles").update({ is_verified: true }).eq("id", maya.uid)
  assert(error, "expected an error")
})
await test("users cannot edit someone else's profile", async () => {
  const { data } = await maya.from("profiles").update({ headline: "hacked" }).eq("id", daniel.uid).select()
  assert(!data?.length, "update should affect 0 rows")
})
await test("users can edit their own profile", async () => {
  const { error } = await maya.from("profiles").update({ city: "San Francisco" }).eq("id", maya.uid)
  assert(!error, error?.message)
})
await test("startups are publicly readable (anon)", async () => {
  const { data } = await anon.from("startups").select("slug")
  assert(data?.length > 0, "anon should read startups")
})
await test("owners cannot self-verify their startup", async () => {
  const { error } = await maya.from("startups").update({ is_verified: true }).eq("owner_id", maya.uid)
  assert(error, "expected an error")
})

console.log("\nConnections & messaging")
await test("third parties cannot see others' connections", async () => {
  const { data } = await maya.from("connections").select("*").eq("requester_id", daniel.uid)
  assert(data.length === 0, `saw ${data.length} rows`)
})
await test("connection request created a notification for the recipient", async () => {
  const { data } = await maya.from("notifications").select("type").eq("type", "connection_request")
  assert(data.length >= 1, "no connection_request notification")
})
await test("requester cannot accept their own request", async () => {
  const hana = await as("hana@demo.cofoundry.dev")
  const { error } = await hana.from("connections").update({ status: "accepted" }).eq("addressee_id", maya.uid)
  assert(error || true, "")
  const { data } = await service.from("connections").select("status").eq("requester_id", hana.uid).eq("addressee_id", maya.uid).single()
  assert(data.status === "pending", "status changed to " + data.status)
})
await test("outsiders cannot read a private conversation", async () => {
  const { data } = await daniel.from("messages").select("id")
  const { data: mine } = await daniel.rpc("get_my_conversations")
  assert(data.length === 0 && mine.length === 0, `daniel saw ${data.length} messages`)
})
await test("get_or_create_dm is idempotent and messaging works", async () => {
  const { data: c1, error } = await daniel.rpc("get_or_create_dm", { other_id: maya.uid })
  assert(!error, error?.message)
  const { data: c2 } = await maya.rpc("get_or_create_dm", { other_id: daniel.uid })
  assert(c1 === c2, "different conversations returned")
  const { error: e2 } = await daniel.from("messages").insert({ conversation_id: c1, sender_id: daniel.uid, body: "Hi Maya — saw your co-founder post!" })
  assert(!e2, e2?.message)
  const { data: inbox } = await maya.rpc("get_my_conversations")
  const row = inbox.find((r) => r.id === c1)
  assert(row && row.unread_count >= 1, "unread count missing")
})
await test("cannot send a message as someone else", async () => {
  const { data: cid } = await daniel.rpc("get_or_create_dm", { other_id: maya.uid })
  const { error } = await daniel.from("messages").insert({ conversation_id: cid, sender_id: maya.uid, body: "spoof" })
  assert(error, "expected an error")
})
await test("group chats require connections", async () => {
  const { error } = await maya.rpc("create_group_conversation", { group_title: "x", member_ids: [daniel.uid, lucas.uid] })
  assert(error, "should fail: maya is not connected to daniel")
})

console.log("\nCommunities")
const { data: comms } = await service.from("communities").select("id, slug")
const commId = Object.fromEntries(comms.map((c) => [c.slug, c.id]))
await test("non-members cannot post", async () => {
  const { error } = await maya.from("community_posts").insert({ community_id: commId.gaming, author_id: maya.uid, title: "Hello gamers", body: "x" })
  assert(error, "expected an error")
})
await test("members cannot publish announcements", async () => {
  const { error } = await maya.from("community_posts").insert({ community_id: commId.healthtech, author_id: maya.uid, type: "announcement", title: "Official news", body: "x" })
  assert(error, "expected an error")
})
await test("moderators can pin posts", async () => {
  const { data: p } = await service.from("community_posts").select("id").eq("community_id", commId.saas).limit(1).single()
  const { error } = await noah.from("community_posts").update({ is_pinned: true }).eq("id", p.id)
  assert(!error, error?.message)
})
await test("community chat is members-only", async () => {
  const { data } = await maya.from("community_messages").select("id").eq("community_id", commId["ai-ml"])
  assert(data.length > 0, "member should read chat")
  const { data: d2 } = await lucas.from("community_messages").select("id").eq("community_id", commId.gaming)
  assert(d2.length === 0, "non-member read chat")
})
await test("comment counters are trigger-maintained and not forgeable", async () => {
  const { data: p } = await service.from("community_posts").select("id, comment_count").eq("author_id", maya.uid).limit(1).single()
  await maya.from("community_posts").update({ comment_count: 999 }).eq("id", p.id)
  const { data: after } = await service.from("community_posts").select("comment_count").eq("id", p.id).single()
  assert(after.comment_count === p.comment_count, "counter was forged")
})
await test("mentions create notifications", async () => {
  const { data } = await service.from("notifications").select("id").eq("recipient_id", (await service.from("profiles").select("id").eq("full_name", "Arjun Mehta").single()).data.id).eq("type", "mention")
  assert(data.length >= 1, "no mention notification")
})

console.log("\nOpportunities")
const { data: mayaOpp } = await service.from("opportunities").select("id").eq("author_id", maya.uid).limit(1).single()
await test("cannot apply to own opportunity", async () => {
  const { error } = await maya.from("opportunity_applications").insert({ opportunity_id: mayaOpp.id, applicant_id: maya.uid, message: "Applying to myself!" })
  assert(error, "expected an error")
})
await test("applying works and notifies the author; applicant can't accept themselves", async () => {
  const { data: app, error } = await daniel.from("opportunity_applications").insert({ opportunity_id: mayaOpp.id, applicant_id: daniel.uid, message: "I've built LLM pipelines for two SaaS products." }).select().single()
  assert(!error, error?.message)
  const { error: e2 } = await daniel.from("opportunity_applications").update({ status: "accepted" }).eq("id", app.id)
  assert(e2, "applicant self-accepted")
  const { data: n } = await maya.from("notifications").select("id").eq("type", "opportunity_application")
  assert(n.length >= 1, "no notification")
  const { data: count } = await service.from("opportunities").select("application_count").eq("id", mayaOpp.id).single()
  assert(count.application_count === 1, "count=" + count.application_count)
})
await test("applications are private to the parties", async () => {
  const { data } = await lucas.from("opportunity_applications").select("id")
  assert(data.length === 0, "lucas saw applications")
})

console.log("\nMentorship, workspaces, admin")
await test("mentees can request; mentor must schedule to accept", async () => {
  const { data: r, error } = await maya.from("mentorship_requests").insert({ mentor_id: lucas.uid, mentee_id: maya.uid, topic: "Pre-seed timing", message: "Should we raise before converting pilots to paid?" }).select().single()
  assert(!error, error?.message)
  const { error: e2 } = await lucas.from("mentorship_requests").update({ status: "accepted" }).eq("id", r.id)
  assert(e2, "accepted without a time")
  const { error: e3 } = await lucas.from("mentorship_requests").update({ status: "accepted", scheduled_at: new Date(Date.now() + 86400e3).toISOString() }).eq("id", r.id)
  assert(!e3, e3?.message)
  const { error: e4 } = await maya.from("mentorship_reviews").insert({ request_id: r.id, mentor_id: lucas.uid, reviewer_id: maya.uid, rating: 5 })
  assert(e4, "reviewed before completion")
})
await test("workspace invites limited to connections; data private to members", async () => {
  const { data: ws, error } = await maya.from("workspaces").insert({ name: "Lumen x Lucas", created_by: maya.uid }).select().single()
  assert(!error, error?.message)
  const { error: e1 } = await maya.from("workspace_members").insert({ workspace_id: ws.id, profile_id: daniel.uid })
  assert(e1, "invited a non-connection")
  const { error: e2 } = await maya.from("workspace_members").insert({ workspace_id: ws.id, profile_id: lucas.uid })
  assert(!e2, e2?.message)
  const { data: seen } = await daniel.from("workspaces").select("id").eq("id", ws.id)
  assert(seen.length === 0, "outsider saw workspace")
})
await test("admin functions reject non-admins", async () => {
  const { error } = await maya.rpc("admin_stats")
  assert(error, "non-admin got stats")
  const { data, error: e2 } = await admin.rpc("admin_stats")
  assert(!e2 && data.totals.users >= 18, e2?.message)
})
await test("verification is only granted through admin review", async () => {
  const { data: req, error } = await maya.from("verification_requests").insert({ requester_id: maya.uid, target_type: "profile", evidence: "LinkedIn shows 8 years running clinics; company registration attached." }).select().single()
  assert(!error, error?.message)
  const { error: e2 } = await maya.from("verification_requests").update({ status: "approved" }).eq("id", req.id)
  const { data: p } = await service.from("profiles").select("is_verified").eq("id", maya.uid).single()
  assert(!p.is_verified, "self-approved")
  const { error: e3 } = await admin.from("verification_requests").update({ status: "approved", review_note: "Checked LinkedIn" }).eq("id", req.id)
  assert(!e3, e3?.message)
  const { data: p2 } = await service.from("profiles").select("is_verified").eq("id", maya.uid).single()
  assert(p2.is_verified, "approval did not verify")
  void e2
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
