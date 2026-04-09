import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getDeviceInfo } from '@/lib/device-info'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userAgent = req.headers.get('user-agent') ?? ''
  const ip_address = req.headers.get('x-forwarded-for') ?? 'Unknown'
  const { device_name, browser, os } = getDeviceInfo(userAgent)
  const session_token = uuidv4()

  // Mark all other sessions as not current
  await supabase
    .from('user_sessions')
    .update({ is_current: false })
    .eq('user_id', user.id)

  // Insert new session
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

  console.log('Creating session, token:', session_token)
  console.log('Setting cookie finflow_session')

  // Store session token in cookie
  const response = NextResponse.json({ success: true })
  response.cookies.set('finflow_session', session_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return response
}
