import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, email } = await req.json()

  const authSupabase = await createAuthClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.id !== userId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  // Read real client IP from headers (Vercel forwards via x-forwarded-for)
  const rawIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const isPrivateOrReservedIp = (ip: string): boolean => {
    return (
      ip.startsWith('127.') ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('169.254.')
    )
  }

  const ipAddress =
    rawIp && ipv4Regex.test(rawIp) && !isPrivateOrReservedIp(rawIp) ? rawIp : null

  // Fetch city, country from IP
  let city = ''
  let country = ''
  if (ipAddress) {
    try {
      const geoRes = await fetch(`https://ip-api.com/json/${ipAddress}`)
      const geoData = await geoRes.json()
      city = geoData.city || ''
      country = geoData.country || ''
    } catch (e) {}
  }

  const device = req.headers.get('user-agent') || ''
  const cookie_id = req.cookies.get('cookie_id')?.value || null

  const { error } = await supabase
    .from('user_management')
    .upsert({
      user_id: userId,
      email: email,
      ip_address: ipAddress,
      last_login: new Date().toISOString(),
      login_count: 1,
      city,
      country,
      device,
      cookie_id,
    }, { onConflict: 'user_id' })
  
  return NextResponse.json({ ok: true })
}
