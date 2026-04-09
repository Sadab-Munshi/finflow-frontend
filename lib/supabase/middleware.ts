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

      // Check if session is blocked (blocklist approach)
      const sessionToken = request.cookies.get('finflow_session')?.value
      console.log('Cookie finflow_session value:', sessionToken)

      // If no session token cookie, skip blocklist check and continue
      if (!sessionToken) {
        // No finflow_session cookie — do not redirect, just continue
      } else {
        const { data: sessionData } = await serviceClient
          .from('user_sessions')
          .select('is_blocked')
          .eq('session_token', sessionToken)
          .eq('user_id', user.id)
          .single()

        console.log('Middleware checking token:', sessionToken)
        console.log('Session blocked status:', sessionData?.is_blocked)

        if (!sessionData || sessionData.is_blocked) {
          await supabase.auth.signOut()
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          return NextResponse.redirect(url)
        }
      }

      // Check ban status
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
    } catch (error) {
      console.error('Middleware ban check failed:', error)
    }
  }

  return supabaseResponse
}
