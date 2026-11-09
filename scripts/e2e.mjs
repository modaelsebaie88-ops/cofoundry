#!/usr/bin/env node
/**
 * End-to-end tests against the running dev server + local Supabase.
 * Exercises real user journeys in a real browser (Chromium via Playwright).
 *
 *   npm run dev            # in another terminal
 *   npm run test:e2e
 */
import { chromium } from "@playwright/test"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:55324"
const PASSWORD = "Cofoundry!demo1"
const HEADLESS = process.env.HEADED !== "1"

let passed = 0
let failed = 0
async function step(name, fn) {
  const t = Date.now()
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name} (${Date.now() - t}ms)`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${name}\n      ${String(e.message).split("\n").slice(0, 4).join("\n      ")}`)
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

const browser = await chromium.launch({ headless: HEADLESS })
async function session(email) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(30000)
  if (email) {
    await page.goto(`${BASE}/login`)
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 60000 }), page.click("button[type=submit]")])
  }
  return page
}

console.log("\nSign-up, email verification & onboarding")
const stamp = Date.now().toString(36)
const newEmail = `e2e-${stamp}@example.com`
let newUser
await step("sign up shows the verification screen", async () => {
  newUser = await session(null)
  await newUser.goto(`${BASE}/signup`)
  await newUser.fill("#fullName", "Riley Tester")
  await newUser.fill("#email", newEmail)
  await newUser.fill("#password", "Testpass123")
  await newUser.click("button[type=submit]")
  await newUser.getByText("Check your inbox").waitFor()
})
await step("unverified accounts cannot sign in", async () => {
  const p = await session(null)
  await p.goto(`${BASE}/login`)
  await p.fill("#email", newEmail)
  await p.fill("#password", "Testpass123")
  await p.click("button[type=submit]")
  await p.getByText(/verify your email/i).waitFor()
  await p.context().close()
})
await step("verification email link signs the user in and opens onboarding", async () => {
  let link
  for (let i = 0; i < 20 && !link; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${newEmail}`)}`)).json()
    if (list.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json()
      link = (msg.Text.match(/https?:\/\/\S+/g) || []).find((u) => u.includes("verify"))
    }
    if (!link) await new Promise((r) => setTimeout(r, 500))
  }
  expect(link, "no verification email found in Mailpit")
  await newUser.goto(link.replace(/&amp;/g, "&"))
  await newUser.waitForURL(/\/onboarding/, { timeout: 60000 })
})
await step("4-step onboarding completes and lands on a personalised dashboard", async () => {
  const p = newUser
  await p.fill("#headline", "Full-stack engineer exploring fintech ideas")
  await p.selectOption("#country", "United Kingdom")
  await p.fill("#city", "London")
  await p.getByRole("button", { name: "Continue" }).click()
  await p.getByText("Step 2 of 4").waitFor()
  await p.fill("#s_name", `Ledgerly ${stamp}`)
  await p.selectOption("#category", { label: "FinTech" })
  await p.getByRole("button", { name: /^MVP/ }).click()
  await p.fill("#desc", "Automated bookkeeping for freelancers that reconciles invoices and bank feeds in real time.")
  await p.getByRole("button", { name: "Marketing & growth" }).click()
  await p.getByRole("button", { name: "Continue" }).click()
  await p.getByText("Step 3 of 4").waitFor()
  await p.selectOption("#frole", "CTO")
  await p.fill("#years", "6")
  for (const skill of ["TypeScript", "Next.js", "Python"]) {
    await p.fill("#skills", skill)
    await p.keyboard.press("Enter")
  }
  await p.keyboard.press("Escape")
  await p.getByRole("button", { name: "FinTech", exact: true }).click()
  await p.getByRole("button", { name: "Software & SaaS", exact: true }).click()
  await p.getByRole("button", { name: "Continue" }).click()
  await p.getByText("Step 4 of 4").waitFor()
  const groups = p.locator("[role=group]")
  await groups.nth(0).getByRole("button", { name: "Sales" }).click()
  await groups.nth(0).getByRole("button", { name: "Fundraising" }).click()
  await groups.nth(1).getByRole("button", { name: "Engineering" }).click()
  await p.getByRole("button", { name: "Part-time" }).last().click()
  await p.getByRole("button", { name: /Finish/ }).click()
  await p.waitForURL(/\/dashboard/, { timeout: 60000 })
  await p.getByText("Recommended founders for you").waitFor()
  const cards = await p.locator("article").count()
  expect(cards > 0, "no recommendations on the new user's dashboard")
  await p.getByText(/% match|match/).first().waitFor()
})
await step("auto-joined the FinTech community from interests", async () => {
  await newUser.goto(`${BASE}/communities/fintech`)
  await newUser.getByRole("button", { name: /Joined/ }).waitFor()
})

console.log("\nReal-time messaging")
const maya = await session("maya@demo.cofoundry.dev")
const lucas = await session("lucas@demo.cofoundry.dev")
await step("message from Lucas appears live in Maya's open conversation", async () => {
  await maya.goto(`${BASE}/messages`)
  await maya.getByRole("link", { name: /Lucas Martin/ }).first().click()
  await maya.waitForURL(/\/messages\/.+/)
  const convUrl = maya.url()
  await lucas.goto(convUrl)
  const text = `Realtime check ${stamp}`
  await lucas.getByLabel("Message", { exact: true }).fill(text)
  await maya.getByText(/is typing/).waitFor({ timeout: 15000 })
  await lucas.keyboard.press("Enter")
  await maya.getByText(text).waitFor({ timeout: 15000 })
})

console.log("\nCommunities")
await step("post a discussion, reply, react and vote", async () => {
  const title = `E2E discussion ${stamp}`
  await maya.goto(`${BASE}/communities/healthtech`)
  await maya.getByLabel("Title").fill(title)
  await maya.getByLabel("Body").fill("Testing posting end-to-end.")
  await maya.getByRole("button", { name: "Publish" }).click()
  await maya.getByRole("link", { name: title }).click()
  await maya.getByLabel("Reply").fill("First reply from e2e")
  await maya.getByRole("button", { name: "Reply" }).click()
  await maya.getByText("First reply from e2e").waitFor()
  await maya.getByRole("button", { name: /Helpful/ }).click()
  await maya.goto(`${BASE}/communities/marketing?filter=poll`)
  const joinBtn = maya.getByRole("button", { name: "Join community" }).first()
  if (await joinBtn.isVisible()) {
    await joinBtn.click()
    await maya.getByRole("button", { name: /Joined/ }).first().waitFor()
  }
  await maya.getByRole("button", { name: /Communities & word of mouth/ }).click()
  await maya.getByText(/\d+%/).first().waitFor()
})

console.log("\nConnections & workspaces")
await step("Maya accepts Hana's pending connection request", async () => {
  await maya.goto(`${BASE}/network?tab=requests`)
  await maya.getByRole("button", { name: "Accept" }).first().click()
  await maya.getByText(/Connected!/).waitFor()
})
await step("create a workspace with Lucas and add an assigned task", async () => {
  await maya.goto(`${BASE}/workspaces`)
  await maya.getByRole("button", { name: "New workspace" }).first().click()
  await maya.getByPlaceholder(/Lumen × Daniel/).fill(`Pilot sprint ${stamp}`)
  await maya.getByRole("dialog").getByText("Lucas Martin").click()
  await maya.getByRole("button", { name: "Create" }).click()
  await maya.waitForURL(/\/workspaces\/.+/)
  await maya.getByRole("link", { name: "tasks" }).click()
  await maya.getByLabel("Task title").fill("Draft pilot agreement")
  await maya.getByRole("button", { name: "Add", exact: true }).click()
  await maya.getByText("Draft pilot agreement").waitFor()
})

console.log("\nOpportunities")
await step("Daniel applies to Maya's opportunity; Maya accepts", async () => {
  const daniel = await session("daniel@demo.cofoundry.dev")
  await daniel.goto(`${BASE}/opportunities?type=cofounder`)
  await daniel.getByRole("link", { name: /Technical co-founder \(AI\/ML\)/ }).click()
  await daniel.getByLabel("Application message").fill("I've shipped LLM pipelines for two B2B SaaS products and would love to help.")
  await daniel.getByRole("button", { name: "Send application" }).click()
  await daniel.getByText("under review").waitFor()
  await maya.goto(`${BASE}/opportunities/mine`)
  await maya.getByRole("link", { name: /applications · 1 new/ }).click()
  await maya.getByRole("button", { name: "Accept" }).click()
  await maya.getByText("Accepted").waitFor()
  await daniel.reload()
  await daniel.getByText(/application was accepted/).waitFor()
  await daniel.context().close()
})

console.log("\nEvents & mentorship")
await step("register for an event and see confirmation", async () => {
  await lucas.goto(`${BASE}/events`)
  await lucas.getByText("AI Builders Hack Weekend").click()
  await lucas.getByRole("button", { name: "Register" }).click()
  await lucas.getByText("You're registered").waitFor()
})
await step("request a mentorship session from Amara", async () => {
  await maya.goto(`${BASE}/mentorship`)
  await maya.getByText("Amara Johnson").first().click()
  await maya.getByPlaceholder(/Preparing for our pre-seed/).fill("Founder-led sales for pilots")
  await maya.getByPlaceholder(/Where you are/).fill("We have two pilot clinics and need a repeatable outbound motion.")
  await maya.getByRole("button", { name: "Send request" }).click()
  await maya.waitForURL(/tab=sessions/)
  await maya.getByText("Founder-led sales for pilots").waitFor()
})

console.log("\nTrust & admin")
await step("founder requests verification; admin approves; badge appears", async () => {
  await newUser.goto(`${BASE}/settings/verification`)
  await newUser.getByRole("button", { name: "Request verification" }).first().click()
  await newUser.getByPlaceholder(/Describe your evidence/).fill("CTO of Ledgerly; company registration and LinkedIn available on request.")
  await newUser.getByRole("button", { name: "Submit" }).click()
  await newUser.getByText("Under review").waitFor()
  const admin = await session("admin@cofoundry.dev")
  await admin.goto(`${BASE}/admin/verification`)
  await admin.getByText("Riley Tester").first().waitFor()
  await admin.getByRole("button", { name: "Approve" }).first().click()
  await admin.getByText(/Verification approved/).waitFor()
  await newUser.goto(`${BASE}/settings/verification`)
  await newUser.getByText("Verified").first().waitFor()
  await admin.context().close()
})
await step("non-admins are redirected away from the admin console", async () => {
  await maya.goto(`${BASE}/admin`)
  await maya.waitForURL(/\/dashboard/)
})
await step("global search finds founders by skill", async () => {
  await maya.goto(`${BASE}/search?q=Python`)
  await maya.getByRole("heading", { name: /Founders/ }).waitFor()
})

await browser.close()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
