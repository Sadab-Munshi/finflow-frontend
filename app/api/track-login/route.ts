import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, email, ipAddress } = await req.json()

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
