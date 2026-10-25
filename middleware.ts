import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // `api/` is excluded on purpose: /api/* is the relay to finflow-api
    // (app/api/[...path]/route.ts). Running the Supabase session middleware
    // there would add a getUser() round-trip to every proxied call and make
    // the API path depend on Supabase being reachable. Auth for /api/* is the
    // Bearer token, validated by finflow-api itself.
    '/((?!api/|_next/static|_next/image|favicon.ico|og-image.png|apple-touch-icon.png|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}