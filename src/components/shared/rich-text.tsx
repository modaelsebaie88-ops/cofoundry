import Link from "next/link"
import { Fragment } from "react"
import { cn } from "@/lib/utils"

const TOKEN = /(@\[[^\]]{1,120}\]\([0-9a-f-]{36}\))|(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])|(\*\*[^*\n]+\*\*)/g

/**
 * Safe renderer for user content: plain text with line breaks, @mentions,
 * auto-linked URLs and **bold**. Never injects HTML.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/)
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed break-words", className)}>
      {paragraphs.map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {renderInline(para)}
        </p>
      ))}
    </div>
  )
}

export function renderInline(text: string) {
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    const idx = m.index ?? 0
    if (idx > last) out.push(text.slice(last, idx))
    const [token, mention, url, bold] = m
    if (mention) {
      const name = mention.slice(2, mention.indexOf("]("))
      const id = mention.slice(mention.indexOf("](") + 2, -1)
      out.push(
        <Link key={idx} href={`/founders/${id}`} className="rounded bg-accent px-1 font-medium text-accent-foreground hover:underline">
          @{name}
        </Link>
      )
    } else if (url) {
      out.push(
        <a key={idx} href={url} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-primary underline-offset-2 hover:underline">
          {url.replace(/^https?:\/\//, "").slice(0, 60)}
          {url.replace(/^https?:\/\//, "").length > 60 ? "…" : ""}
        </a>
      )
    } else if (bold) {
      out.push(<strong key={idx}>{bold.slice(2, -2)}</strong>)
    } else {
      out.push(<Fragment key={idx}>{token}</Fragment>)
    }
    last = idx + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
