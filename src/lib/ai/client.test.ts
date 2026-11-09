import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { AiNotConfiguredError, aiConfig, streamChat } from "./client"

function sse(chunks: string[]) {
  const enc = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch))
      c.close()
    },
  })
}

async function readAll(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const dec = new TextDecoder()
  let out = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return out
    out += dec.decode(value)
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("AI client", () => {
  it("reports not configured without a key (never fakes output)", async () => {
    vi.stubEnv("AI_API_KEY", "")
    vi.stubEnv("GEMINI_API_KEY", "")
    expect(aiConfig().enabled).toBe(false)
    await expect(streamChat([{ role: "user", content: "hi" }])).rejects.toBeInstanceOf(AiNotConfiguredError)
  })

  it("parses OpenAI-compatible SSE deltas, including chunks split mid-line", async () => {
    vi.stubEnv("AI_API_KEY", "test-key")
    vi.stubEnv("AI_MODEL", "test-model")
    vi.stubEnv("AI_BASE_URL", "https://example.test/v1/")
    const fetchMock = vi.fn(async () =>
      new Response(
        sse([
          'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"lo, "}}]}\n\ndata: {"choices":[{"del',
          'ta":{"content":"founder"}}]}\n\n',
          ": keep-alive\n\n",
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    )
    vi.stubGlobal("fetch", fetchMock)
    const text = await readAll(await streamChat([{ role: "user", content: "hi" }]))
    expect(text).toBe("Hello, founder")
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://example.test/v1/chat/completions")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key")
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "test-model", stream: true })
  })

  it("defaults to Gemini's OpenAI-compatible endpoint and accepts GEMINI_API_KEY", () => {
    vi.stubEnv("AI_API_KEY", "")
    vi.stubEnv("AI_BASE_URL", "")
    vi.stubEnv("AI_MODEL", "")
    vi.stubEnv("GEMINI_API_KEY", "g-key")
    const cfg = aiConfig()
    expect(cfg).toMatchObject({
      enabled: true,
      apiKey: "g-key",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-2.5-flash",
    })
  })

  it("surfaces provider errors", async () => {
    vi.stubEnv("AI_API_KEY", "k")
    vi.stubEnv("AI_MODEL", "m")
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })))
    await expect(streamChat([{ role: "user", content: "hi" }])).rejects.toThrow(/429/)
  })
})
