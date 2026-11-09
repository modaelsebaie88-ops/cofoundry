#!/usr/bin/env node
/**
 * Dev helper: signs in through the real login form, visits pages, saves
 * screenshots and reports console errors / failed responses.
 *
 *   node scripts/visit.mjs <email|-> <outDir> /path1 /path2 ...   (use "-" for signed-out)
 *   VIEWPORT=390x844 node scripts/visit.mjs ...                  (mobile)
 */
import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"

const [email, outDir, ...paths] = process.argv.slice(2)
const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const [w, h] = (process.env.VIEWPORT ?? "1440x900").split("x").map(Number)
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: w, height: h } })
const problems = []
page.on("console", (m) => { if (m.type() === "error") problems.push(`[console] ${page.url()} ${m.text().slice(0, 300)}`) })
page.on("pageerror", (e) => problems.push(`[pageerror] ${page.url()} ${e.message.slice(0, 300)}`))
page.on("response", (r) => { if (r.status() >= 500) problems.push(`[${r.status()}] ${r.url()}`) })

if (email && email !== "-") {
  await page.goto(`${BASE}/login`)
  await page.fill("#email", email)
  await page.fill("#password", process.env.PASSWORD ?? "Cofoundry!demo1")
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), page.click("button[type=submit]")])
}

for (const p of paths) {
  const t = Date.now()
  const res = await page.goto(`${BASE}${p}`, { waitUntil: "networkidle", timeout: 90000 }).catch((e) => (problems.push(`[goto] ${p} ${e.message}`), null))
  await page.waitForTimeout(400)
  const name = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root"
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: process.env.FULL === "1" })
  const title = await page.title()
  const errorText = await page.locator("text=/Unhandled Runtime Error|Application error|This page could not be found/").count()
  console.log(`${res?.status() ?? "ERR"} ${p} → ${new URL(page.url()).pathname} (${Date.now() - t}ms) "${title}"${errorText ? " ⚠ ERROR UI" : ""}`)
}
if (problems.length) console.log("\nProblems:\n" + [...new Set(problems)].join("\n"))
await browser.close()
