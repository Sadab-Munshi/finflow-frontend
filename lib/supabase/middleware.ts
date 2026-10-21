import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY =
  'placeholder-supabase-anon-key'

function checkIsPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/sw.js' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/site.webmanifest' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/complete') ||
    pathname.startsWith('/auth/set-password') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/disclaimer') ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/user-guide')
  )
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = checkIsPublicRoute(pathname)

  // Fast path: if the visitor has no Supabase auth cookies at all, avoid
  // instantiating the Supabase client or setting Cache-Control: no-store on
  // public pages (enables browser bfcache and zero-latency public SSR).
  const hasSbCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-'))

  if (!hasSbCookie) {
    if (!isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Ban check for authenticated users on protected routes
  if (user && !isPublicRoute && !pathname.startsWith('/api')) {
    try {
      const { data: banData, error: banError } = await supabase
        .from('user_management')
        .select('is_banned, ip_banned, ban_reason')
        .eq('user_id', user.id)
        .maybeSingle()

      if (banError && banError.code !== 'PGRST116') {
        console.error('[Middleware] Ban check query error:', banError.message)
      }

      if (banData && (banData.is_banned === true || banData.ip_banned === true)) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('banned', 'true')
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('[Middleware] Ban check error:', error)
    }
  }

  return supabaseResponse
}
