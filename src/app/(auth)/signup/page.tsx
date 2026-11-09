import type { Metadata } from "next"
import Link from "next/link"
import { SignupForm } from "./signup-form"

export const metadata: Metadata = { title: "Create your account" }

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your founder account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Join a network of founders building together. It takes about 3 minutes.</p>
      <div className="mt-8">
        <SignupForm googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"} />
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
