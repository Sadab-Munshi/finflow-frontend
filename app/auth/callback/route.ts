import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Email confirmation (signup) - sign out and redirect to login
      // Note: type param is standard Supabase callback param; even if manipulated,
      // worst case is user is signed out and redirected to login (safe outcome)
      if (type === 'signup') {
        await supabase.auth.signOut({ scope: 'local' })
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
