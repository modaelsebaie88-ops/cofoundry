"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Loader2, RotateCcw, SendHorizontal, Square } from "lucide-react"
import { Markdown } from "@/components/shared/markdown"
import { Panel } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Msg = { role: "user" | "assistant"; content: string }

const PROMPTS = [
  "Which founders on Cofoundry should I reach out to first, and why?",
  "What skills are missing from my startup team?",
  "Which communities should I join?",
  "Suggest potential partnerships for my startup.",
  "Write a 3-sentence introduction of my startup for outreach.",
  "Improve my startup description.",
  "Which open opportunities fit me best?",
  "What challenges should I expect at my current stage?",
]
const STORAGE_KEY = "cofoundry.assistant.v1"

export function AssistantChat({ firstName, model }: { firstName: string; model: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      // Restoring from browser storage (an external system) after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)))
    } catch {}
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    setError(null)
    const history: Msg[] = [...messages, { role: "user", content }]
    setMessages([...history, { role: "assistant", content: "" }])
    setInput("")
    setBusy(true)
    abort.current = new AbortController()
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20) }),
        signal: abort.current.signal,
      })
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "The assistant is unavailable right now.")
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        const content = acc
        setMessages((m) => [...m.slice(0, -1), { role: "assistant", content }])
      }
      if (!acc) throw new Error("The model returned an empty response.")
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      setError((e as Error).message)
      setMessages((m) => (m[m.length - 1]?.role === "assistant" && !m[m.length - 1].content ? m.slice(0, -1) : m))
    } finally {
      setBusy(false)
      abort.current = null
    }
  }

  return (
    <Panel className="flex h-[calc(100dvh-14rem)] min-h-[32rem] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4 text-primary" /> Assistant <span className="text-xs font-normal text-muted-foreground">· {model}</span>
        </p>
        {messages.length > 0 && (
          <Button variant="ghost" size="xs" onClick={() => (abort.current?.abort(), setMessages([]), setError(null))}>
            <RotateCcw /> New chat
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-xl py-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-gradient text-white">
              <Bot className="size-6" />
            </div>
            <p className="font-semibold">Hi {firstName} — how can I help you build?</p>
            <p className="mt-1 text-sm text-muted-foreground">I use your profile, startup and live Cofoundry data. Try one of these:</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {PROMPTS.map((p) => (
                <button key={p} type="button" onClick={() => send(p)} className="rounded-xl border bg-white px-3 py-2.5 text-left text-sm transition hover:border-primary/40 hover:bg-accent/40">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
                {m.role === "assistant" && (
                  <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
                    <Bot className="size-4" />
                  </span>
                )}
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3", m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-white")}>
                  {m.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  ) : m.content ? (
                    <Markdown className="text-sm [&_p]:my-2">{m.content}</Markdown>
                  ) : (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottom} />
          </div>
        )}
      </div>
      {error && <p className="mx-5 mb-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          maxLength={8000}
          placeholder="Ask about collaborators, team gaps, positioning…"
          aria-label="Message the assistant"
          className="max-h-40 min-h-10 flex-1 resize-none rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
        {busy ? (
          <Button type="button" size="icon" className="size-10" variant="outline" onClick={() => abort.current?.abort()} aria-label="Stop generating">
            <Square />
          </Button>
        ) : (
          <Button type="submit" size="icon" className="size-10" disabled={!input.trim()} aria-label="Send">
            <SendHorizontal />
          </Button>
        )}
      </form>
      <p className="px-4 pb-2 text-center text-[10px] text-muted-foreground">AI-generated responses can be wrong. Verify important decisions.</p>
    </Panel>
  )
}
