import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyInternalSecret } from '@/lib/internal-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json({ banned: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { ipAddress } = body
    if (!ipAddress) return NextResponse.json({ banned: false })

    const { data } = await supabase
      .from('user_management')
      .select('ip_banned, is_banned')
      .eq('ip_address', ipAddress)
      .maybeSingle()

    return NextResponse.json({ 
      banned: data?.ip_banned === true && data?.is_banned === true 
    })
  } catch (e) {
    return NextResponse.json({ banned: false })
  }
}
