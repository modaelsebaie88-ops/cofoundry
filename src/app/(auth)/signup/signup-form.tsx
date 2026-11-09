"use client"

import { useActionState, useState, useTransition } from "react"
import { MailCheck } from "lucide-react"
import { toast } from "sonner"
import { resendConfirmation, signUp } from "@/actions/auth"
import { GoogleButton } from "@/app/(auth)/google-button"
import { Field, FormError, SubmitButton } from "@/components/shared/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action] = useActionState(signUp, null)
  const [resending, startResend] = useTransition()
  const [password, setPassword] = useState("")
  const fe = state && !state.ok ? state.fieldErrors : undefined

  if (state?.ok) {
    const email = state.message ?? ""
    return (
      <div className="rounded-2xl border bg-card p-6 text-center shadow-soft">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
          <MailCheck className="size-6" />
        </div>
        <h2 className="font-semibold">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a verification link to <span className="font-medium text-foreground">{email}</span>. Click it to activate your
          account and start onboarding.
        </p>
        <Button
          variant="ghost"
          className="mt-4"
          disabled={resending}
          onClick={() =>
            startResend(async () => {
              const r = await resendConfirmation(email)
              if (r.ok) toast.success("Verification email sent again")
              else toast.error(r.error)
            })
          }
        >
          Resend email
        </Button>
      </div>
    )
  }

  const strength = [/.{8,}/, /[A-Za-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length

  return (
    <div className="space-y-5">
      {googleEnabled && <GoogleButton next="/onboarding" />}
      <form action={action} className="space-y-4" noValidate>
        <FormError message={state && !state.ok ? state.error : null} />
        <Field label="Full name" htmlFor="fullName" error={fe?.fullName}>
          <Input id="fullName" name="fullName" autoComplete="name" required className="h-10" placeholder="Jane Founder" />
        </Field>
        <Field label="Work email" htmlFor="email" error={fe?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required className="h-10" placeholder="you@startup.com" />
        </Field>
        <Field label="Password" htmlFor="password" error={fe?.password} hint="At least 8 characters with letters and numbers.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="h-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-1 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i < strength ? (strength >= 3 ? "bg-emerald-500" : "bg-amber-400") : "bg-muted"}`}
              />
            ))}
          </div>
        </Field>
        <SubmitButton className="h-10 w-full" pendingText="Creating account…">
          Create account
        </SubmitButton>
        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to keep this a professional, respectful community.
        </p>
      </form>
    </div>
  )
}
