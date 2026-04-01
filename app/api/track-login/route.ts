import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, email, ipAddress } = await req.json()

  const authSupabase = await createAuthClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.id !== userId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  // Fetch city, country from IP
  let city = ''
  let country = ''
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${ipAddress}`)
    const geoData = await geoRes.json()
    city = geoData.city || ''
    country = geoData.country || ''
  } catch (e) {}

  const device = req.headers.get('user-agent') || ''

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
    }, { onConflict: 'user_id' })
  
  return NextResponse.json({ ok: true })
}
