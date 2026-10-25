import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedRoutes = [
    '/dashboard',
    '/history',
    '/add',
    '/budgets',
    '/insights',
    '/reports',
    '/subscription',
    '/settings',
    '/transaction',
    '/profile',
    '/notifications',
    '/analytics',
    '/backup-restore',
    '/privacy-security',
  ]

  const isProtected = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Ban enforcement moved server-side ──────────────────────────────────────
  // This used to read `user_management` from the Edge with the anon key. That
  // was an administrative table queried by the client-facing app, and it ran on
  // every navigation, so it showed up as one of the duplicate ban checks in the
  // network panel.
  //
  // Enforcement is now authoritative in two places that already run on every
  // request:
  //   * finflow-api `authMiddleware` -> 403 "Account is banned" on any API call
  //   * /api/v1/user/bootstrap      -> `banned` flag, which UserProvider acts on
  //
  // Nothing is lost: a banned user's very first data request is rejected by the
  // API, and bootstrap signs them out. The redirect below still handles the
  // signed-out case.

  return supabaseResponse
}
