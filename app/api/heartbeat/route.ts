import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = body?.userId
    if (!userId) return NextResponse.json({ ok: false })

    await supabase.from('user_heartbeat').upsert({
      user_id: userId,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false })
  }
}
