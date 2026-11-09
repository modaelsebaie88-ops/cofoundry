import Link from "next/link"
import type { VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>

/** A Next.js link styled as a button. */
export function LinkButton({ className, variant, size, ...props }: Props) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
