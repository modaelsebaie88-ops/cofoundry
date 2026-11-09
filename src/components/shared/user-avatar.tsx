import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, initials } from "@/lib/utils"

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-24 text-2xl",
}

export function UserAvatar({
  name,
  src,
  size = "md",
  online,
  className,
}: {
  name?: string | null
  src?: string | null
  size?: keyof typeof sizes
  online?: boolean
  className?: string
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={cn(sizes[size], "after:border-black/5")}>
        {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
        <AvatarFallback className="bg-gradient-to-br from-violet-100 to-sky-100 font-semibold text-primary">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {online !== undefined && (
        <span
          className={cn(
            "absolute right-0 bottom-0 block rounded-full ring-2 ring-white",
            size === "xs" || size === "sm" ? "size-2" : "size-3",
            online ? "bg-emerald-500" : "bg-zinc-300"
          )}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </span>
  )
}

export function StartupLogo({
  name,
  src,
  size = "md",
  className,
}: {
  name: string
  src?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  const s = {
    sm: "size-8 text-xs rounded-lg",
    md: "size-10 text-sm rounded-xl",
    lg: "size-14 text-lg rounded-2xl",
    xl: "size-20 text-2xl rounded-2xl",
  }[size]
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`${name} logo`} className={cn(s, "shrink-0 border bg-white object-cover", className)} />
  ) : (
    <span className={cn(s, "inline-flex shrink-0 items-center justify-center bg-brand-gradient font-semibold text-white", className)}>
      {initials(name)}
    </span>
  )
}
