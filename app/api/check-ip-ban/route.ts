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
      .select('ip_banned')
      .eq('ip_address', ipAddress)
      .eq('ip_banned', true)
      .limit(1)

    return NextResponse.json({ 
      banned: Array.isArray(data) && data.length > 0
    })
  } catch (e) {
    return NextResponse.json({ banned: false })
  }
}
