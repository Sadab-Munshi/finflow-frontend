import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDeviceInfo } from '@/lib/device-info'
import { v4 as uuidv4 } from 'uuid'

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
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }

      // Create a session record for this device (OAuth login)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const userAgent = request.headers.get('user-agent') ?? ''
        const ip_address = request.headers.get('x-forwarded-for') ?? 'Unknown'
        const { device_name, browser, os } = getDeviceInfo(userAgent)
        const session_token = uuidv4()

        await supabase
          .from('user_sessions')
          .update({ is_current: false })
          .eq('user_id', user.id)

        await supabase.from('user_sessions').insert({
          user_id: user.id,
          session_token,
          device_name,
          browser,
          os,
          ip_address,
          is_current: true,
          last_active_at: new Date().toISOString(),
        })

        const response = NextResponse.redirect(`${origin}${next}`)
        response.cookies.set('finflow_session', session_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        })
        return response
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
