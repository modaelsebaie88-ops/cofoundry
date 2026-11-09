"use client"

import { Loader2 } from "lucide-react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function SubmitButton({
  children,
  pendingText,
  className,
  variant,
  size = "lg",
  disabled,
}: {
  children: React.ReactNode
  pendingText?: string
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} className={className} variant={variant} size={size}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  )
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: React.ReactNode
  htmlFor?: string
  error?: string
  hint?: React.ReactNode
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground/90">
        {label}
        {required && <span className="text-primary">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  )
}

/** Pill toggles for choosing several options from a fixed vocabulary. */
export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  max,
  name,
}: {
  options: { value: T; label: string }[]
  value: T[]
  onChange: (v: T[]) => void
  max?: number
  name?: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => {
        const active = value.includes(o.value)
        const blocked = !active && max !== undefined && value.length >= max
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={blocked}
            onClick={() => onChange(active ? value.filter((x) => x !== o.value) : [...value, o.value])}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-white text-foreground/80 hover:border-primary/30 hover:bg-accent",
              blocked && "cursor-not-allowed opacity-40"
            )}
          >
            {o.label}
          </button>
        )
      })}
      {name && value.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
    </div>
  )
}
