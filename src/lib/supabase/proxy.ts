import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PREFIXES = ["/login", "/signup", "/forgot-password", "/auth", "/startups", "/legal"]

function isPublic(pathname: string) {
  return pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

/**
 * Refreshes the Supabase session cookie on every request and performs an
 * optimistic redirect for signed-out visitors. Real authorization happens in
 * server code and RLS — this is only a UX convenience.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v))
        },
      },
    }
  )

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const { pathname, search } = request.nextUrl

  if (!signedIn && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  if (signedIn && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}
