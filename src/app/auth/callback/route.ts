import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Handles PKCE redirects from Supabase Auth: email verification, password
 * recovery and OAuth sign-in all land here with a one-time `code`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next") ?? "/dashboard"
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard"
  const errorDescription = searchParams.get("error_description")

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`)
  }
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That link is invalid or has expired. Please try again.")}`
    )
  }
  return NextResponse.redirect(`${origin}/login`)
}
