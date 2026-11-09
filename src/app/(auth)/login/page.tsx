import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to continue building with your network.</p>
      <div className="mt-8">
        <LoginForm next={next} initialError={error} googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"} />
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to Cofoundry?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
