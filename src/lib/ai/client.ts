import "server-only"

/**
 * Minimal OpenAI-compatible Chat Completions client. Defaults to Google Gemini's
 * OpenAI-compatible endpoint; also works with OpenAI, OpenRouter, Together, local
 * vLLM/Ollama servers and any provider exposing /chat/completions. Keys stay on the server.
 */
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"

export function aiConfig() {
  const apiKey = process.env.AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()
  const baseUrl = (process.env.AI_BASE_URL?.trim() || GEMINI_BASE_URL).replace(/\/+$/, "")
  const model = process.env.AI_MODEL?.trim() || (baseUrl === GEMINI_BASE_URL ? "gemini-2.5-flash" : "")
  return { apiKey, baseUrl, model, enabled: Boolean(apiKey && model) }
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI assistant is not configured. Set AI_API_KEY and AI_MODEL on the server.")
  }
}

/** Streams assistant text deltas from the provider. */
export async function streamChat(messages: ChatMessage[], opts: { signal?: AbortSignal; temperature?: number } = {}) {
  const cfg = aiConfig()
  if (!cfg.enabled) throw new AiNotConfiguredError()

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, messages, stream: true, temperature: opts.temperature ?? 0.4 }),
    signal: opts.signal,
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "")
    throw new Error(`AI provider error (${res.status}): ${text.slice(0, 300)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      let buffer = ""
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const payload = trimmed.slice(5).trim()
            if (payload === "[DONE]") continue
            try {
              const json = JSON.parse(payload)
              const delta: string | undefined = json.choices?.[0]?.delta?.content
              if (delta) controller.enqueue(encoder.encode(delta))
            } catch {
              // ignore keep-alive / partial lines
            }
          }
        }
      } catch (e) {
        controller.error(e)
        return
      }
      controller.close()
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })
}
