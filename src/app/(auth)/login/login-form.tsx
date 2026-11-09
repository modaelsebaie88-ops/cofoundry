"use client"

import Link from "next/link"
import { useActionState } from "react"
import { signIn } from "@/actions/auth"
import { GoogleButton } from "@/app/(auth)/google-button"
import { Field, FormError, SubmitButton } from "@/components/shared/form"
import { Input } from "@/components/ui/input"

export function LoginForm({ next, initialError, googleEnabled }: { next?: string; initialError?: string; googleEnabled: boolean }) {
  const [state, action] = useActionState(signIn, null)
  const fe = state && !state.ok ? state.fieldErrors : undefined
  return (
    <div className="space-y-5">
      {googleEnabled && <GoogleButton next={next} />}
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <FormError message={state && !state.ok ? state.error : initialError} />
        <Field label="Email" htmlFor="email" error={fe?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required className="h-10" placeholder="you@startup.com" />
        </Field>
        <Field
          label={
            <span className="flex w-full items-center justify-between">
              Password
              <Link href="/forgot-password" className="text-xs font-normal text-primary hover:underline">
                Forgot password?
              </Link>
            </span>
          }
          htmlFor="password"
          error={fe?.password}
        >
          <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10" />
        </Field>
        <SubmitButton className="h-10 w-full" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </div>
  )
}
