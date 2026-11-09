"use client"

import { useActionState } from "react"
import { CheckCircle2 } from "lucide-react"
import { updatePassword } from "@/actions/auth"
import { Field, FormError, SubmitButton } from "@/components/shared/form"
import { LinkButton } from "@/components/shared/link-button"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePassword, null)
  const fe = state && !state.ok ? state.fieldErrors : undefined
  if (state?.ok) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-500" />
        <h1 className="text-xl font-semibold">Password updated</h1>
        <p className="mt-1 text-sm text-muted-foreground">You&apos;re signed in with your new password.</p>
        <LinkButton href="/dashboard" className="mt-6 h-10 w-full">
          Go to dashboard
        </LinkButton>
      </div>
    )
  }
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters with letters and numbers.</p>
      <form action={action} className="mt-8 space-y-4">
        <FormError message={state && !state.ok ? state.error : null} />
        <Field label="New password" htmlFor="password" error={fe?.password}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required className="h-10" />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={fe?.confirm}>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="h-10" />
        </Field>
        <SubmitButton className="h-10 w-full" pendingText="Saving…">
          Update password
        </SubmitButton>
      </form>
    </div>
  )
}
