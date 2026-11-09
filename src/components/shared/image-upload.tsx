"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn, initials } from "@/lib/utils"

const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

/**
 * Uploads an image to a public bucket under <uid>/... (enforced by storage RLS)
 * and returns its public URL.
 */
export function ImageUpload({
  bucket,
  value,
  onChange,
  shape = "circle",
  label = "Upload photo",
  fallbackName,
}: {
  bucket: "avatars" | "startup-assets"
  value: string | null
  onChange: (url: string | null) => void
  shape?: "circle" | "rounded" | "banner"
  label?: string
  fallbackName?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    if (!TYPES.includes(file.type)) return toast.error("Use a PNG, JPG, WebP or GIF image.")
    if (file.size > MAX_BYTES) return toast.error("Images must be 5 MB or smaller.")
    setBusy(true)
    try {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error("Please sign in again.")
      const ext = file.name.split(".").pop()?.toLowerCase() || "png"
      const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  const frame = {
    circle: "size-20 rounded-full",
    rounded: "size-20 rounded-2xl",
    banner: "h-28 w-full rounded-xl",
  }[shape]

  return (
    <div className={cn("flex items-center gap-4", shape === "banner" && "flex-col items-stretch")}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          frame,
          "group relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed bg-soft-gradient text-primary transition hover:border-primary/40"
        )}
        aria-label={label}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : fallbackName ? (
          <span className="text-xl font-semibold">{initials(fallbackName)}</span>
        ) : (
          <ImagePlus className="size-6" />
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/35 text-white group-hover:flex">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        </span>
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="size-5 animate-spin" />
          </span>
        )}
      </button>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {value ? "Change" : label}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} disabled={busy}>
            <X /> Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
    </div>
  )
}
