"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ArrowLeft, MailCheck } from "lucide-react"
import { requestPasswordReset } from "@/actions/auth"
import { Field, FormError, SubmitButton } from "@/components/shared/form"
import { Input } from "@/components/ui/input"

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, null)
  return (
    <div>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your account email and we&apos;ll send you a reset link.</p>
      {state?.ok ? (
        <div className="mt-8 rounded-2xl border bg-card p-6 text-center shadow-soft">
          <MailCheck className="mx-auto mb-2 size-6 text-primary" />
          <p className="text-sm">If an account exists for that email, a reset link is on its way.</p>
        </div>
      ) : (
        <form action={action} className="mt-8 space-y-4">
          <FormError message={state && !state.ok ? state.error : null} />
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required className="h-10" />
          </Field>
          <SubmitButton className="h-10 w-full" pendingText="Sending…">
            Send reset link
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
