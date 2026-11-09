import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { aiConfig, streamChat } from "@/lib/ai/client"
import { buildAssistantContext, SYSTEM_PROMPT } from "@/lib/ai/context"

export const runtime = "nodejs"

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(30),
})

// Simple per-user rate limit (per server instance). Use a shared store (e.g. Redis) when scaling out.
const WINDOW_MS = 60 * 60 * 1000
const LIMIT = 40
const hits = new Map<string, number[]>()

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const cfg = aiConfig()
  if (!cfg.enabled) {
    return NextResponse.json({ error: "The AI assistant isn't configured on this server yet." }, { status: 503 })
  }

  const now = Date.now()
  const recent = (hits.get(auth.user.id) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= LIMIT) return NextResponse.json({ error: "You've reached the hourly assistant limit. Please try again later." }, { status: 429 })
  hits.set(auth.user.id, [...recent, now])

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    const context = await buildAssistantContext(supabase, auth.user.id)
    const stream = await streamChat(
      [{ role: "system", content: `${SYSTEM_PROMPT}\n\n=== PLATFORM CONTEXT ===\n${context}` }, ...parsed.data.messages],
      { signal: request.signal }
    )
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } })
  } catch (e) {
    console.error("assistant error", e)
    return NextResponse.json({ error: "The AI provider returned an error. Please try again." }, { status: 502 })
  }
}
