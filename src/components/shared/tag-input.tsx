"use client"

import { useId, useMemo, useRef, useState } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Free-form tag input with autocomplete suggestions (e.g. skills).
 * Enter / comma adds; Backspace on an empty input removes the last tag.
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Type and press Enter",
  max = 20,
  allowCustom = true,
  id,
  invalid,
}: {
  value: string[]
  onChange: (v: string[]) => void
  suggestions?: string[]
  placeholder?: string
  max?: number
  allowCustom?: boolean
  id?: string
  invalid?: boolean
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const lowerValue = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value])
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return suggestions
      .filter((s) => !lowerValue.has(s.toLowerCase()) && (!q || s.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.toLowerCase().startsWith(q)) - Number(a.toLowerCase().startsWith(q)))
      .slice(0, 8)
  }, [query, suggestions, lowerValue])

  function add(raw: string) {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, 60)
    if (!tag || lowerValue.has(tag.toLowerCase()) || value.length >= max) return
    const canonical = suggestions.find((s) => s.toLowerCase() === tag.toLowerCase())
    if (!canonical && !allowCustom) return
    onChange([...value, canonical ?? tag])
    setQuery("")
    setHighlight(0)
  }

  const showCustom = allowCustom && query.trim() && !matches.some((m) => m.toLowerCase() === query.trim().toLowerCase())

  return (
    <div className="relative">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-white px-2 py-1.5 transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
          invalid && "border-destructive"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[13px] font-medium text-accent-foreground">
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="rounded text-accent-foreground/60 hover:text-accent-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onChange(value.filter((v) => v !== tag))
              }}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          value={query}
          disabled={value.length >= max}
          placeholder={value.length >= max ? `Maximum ${max}` : value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              if (open && matches[highlight] && !(showCustom && highlight === matches.length)) add(matches[highlight])
              else add(query)
            } else if (e.key === "Backspace" && !query && value.length) {
              onChange(value.slice(0, -1))
            } else if (e.key === "ArrowDown") {
              e.preventDefault()
              setHighlight((h) => Math.min(h + 1, matches.length - (showCustom ? 0 : 1)))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setHighlight((h) => Math.max(h - 1, 0))
            } else if (e.key === "Escape") {
              setOpen(false)
            }
          }}
        />
      </div>
      {open && (matches.length > 0 || showCustom) && (
        <ul id={listId} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
          {matches.map((m, i) => (
            <li key={m} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(m)}
                className={cn("w-full rounded-md px-2 py-1.5 text-left text-sm", i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
              >
                {m}
              </button>
            </li>
          ))}
          {showCustom && (
            <li role="option" aria-selected={highlight === matches.length}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(query)}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm",
                  highlight === matches.length ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                <Plus className="size-3.5" /> Add &ldquo;{query.trim()}&rdquo;
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
