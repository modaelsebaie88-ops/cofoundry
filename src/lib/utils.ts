export { cn } from "cn"

export function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export function truncate(text: string | null | undefined, max: number) {
  if (!text) return ""
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text
}

export function pluralize(n: number, one: string, many = one + "s") {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`
}

/** Normalises user-entered URLs: adds https:// when the scheme is missing, empty → null. */
export function normalizeUrl(input: string | null | undefined) {
  const v = (input ?? "").trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return ""
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

/** Removes the @[Name](uuid) mention markup for plain-text previews. */
export function stripMentions(text: string) {
  return text.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/g, "@$1")
}
