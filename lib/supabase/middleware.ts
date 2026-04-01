import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
    '/settings',
    '/transaction',
    '/profile',
    '/notifications',
  ]

  const isProtected = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check ban status for authenticated users on protected routes
  if (user && isProtected) {
    try {
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: banData } = await serviceClient
        .from('user_management')
        .select('is_banned, ip_banned')
        .eq('user_id', user.id)
        .maybeSingle()

      if (banData?.is_banned || banData?.ip_banned) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('banned', 'true')
        return NextResponse.redirect(url)
      }
    } catch {
      // Don't block the request if ban check fails
    }
  }

  return supabaseResponse
}
