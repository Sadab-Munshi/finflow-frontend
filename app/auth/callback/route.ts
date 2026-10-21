import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sanitizeInternalRedirect } from '@/lib/security'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const safeNext = sanitizeInternalRedirect(searchParams.get('next'), '/dashboard')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === 'signup') {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
