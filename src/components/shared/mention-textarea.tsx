"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { UserAvatar } from "@/components/shared/user-avatar"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Person = { id: string; full_name: string; avatar_url: string | null; headline: string | null }

/**
 * Textarea with @mention autocomplete. Selected people are inserted as
 * @[Full Name](uuid), which the database turns into mention notifications.
 * If `communityId` is set, suggestions are limited to that community's members.
 */
export const MentionTextarea = forwardRef<
  HTMLTextAreaElement,
  Omit<React.ComponentProps<"textarea">, "onChange" | "value"> & {
    value: string
    onValueChange: (v: string) => void
    communityId?: string
    onSubmitShortcut?: () => void
  }
>(function MentionTextarea({ value, onValueChange, communityId, onSubmitShortcut, className, onKeyDown, ...props }, ref) {
  const inner = useRef<HTMLTextAreaElement>(null)
  useImperativeHandle(ref, () => inner.current!)
  const [query, setQuery] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (query === null) return
    let cancelled = false
    const supabase = createClient()
    const run = async () => {
      const q = query.replace(/[%,()]/g, "")
      if (communityId) {
        const { data } = await supabase
          .from("community_members")
          .select("profiles!inner(id, full_name, avatar_url, headline)")
          .eq("community_id", communityId)
          .ilike("profiles.full_name", `%${q}%`)
          .limit(6)
        if (!cancelled) setPeople((data ?? []).map((d) => d.profiles as unknown as Person))
      } else {
        const { data } = await supabase.from("profiles").select("id, full_name, avatar_url, headline").ilike("full_name", `%${q}%`).limit(6)
        if (!cancelled) setPeople(data ?? [])
      }
      setActive(0)
    }
    const t = setTimeout(run, 120)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, communityId])

  function detect(text: string, caret: number) {
    const before = text.slice(0, caret)
    const m = before.match(/(^|\s)@([\p{L}\p{N} .'-]{0,30})$/u)
    setQuery(m ? m[2] : null)
  }

  function insert(p: Person) {
    const el = inner.current
    if (!el) return
    const caret = el.selectionStart
    const before = value.slice(0, caret).replace(/@([\p{L}\p{N} .'-]{0,30})$/u, "")
    const token = `@[${p.full_name}](${p.id}) `
    const next = before + token + value.slice(caret)
    onValueChange(next)
    setQuery(null)
    requestAnimationFrame(() => {
      el.focus()
      const pos = (before + token).length
      el.setSelectionRange(pos, pos)
    })
  }

  const open = query !== null && people.length > 0

  return (
    <div className="relative">
      <textarea
        ref={inner}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value)
          detect(e.target.value, e.target.selectionStart)
        }}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActive((a) => (a + 1) % people.length)
              return
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((a) => (a - 1 + people.length) % people.length)
              return
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault()
              insert(people[active])
              return
            }
            if (e.key === "Escape") {
              setQuery(null)
              return
            }
          }
          if (onSubmitShortcut && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            onSubmitShortcut()
            return
          }
          onKeyDown?.(e)
        }}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        className={cn(
          "w-full resize-none rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          className
        )}
        {...props}
      />
      {open && (
        <ul role="listbox" className="absolute bottom-full left-0 z-50 mb-1 w-72 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg">
          {people.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(p)}
                className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left", i === active ? "bg-accent" : "hover:bg-muted")}
              >
                <UserAvatar name={p.full_name} src={p.avatar_url} size="xs" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.full_name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{p.headline}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
