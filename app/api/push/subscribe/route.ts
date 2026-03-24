import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { endpoint, keys, userAgent } = await req.json()

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
    }

    // Upsert subscription (update if endpoint exists, insert if new)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh_key: keys.p256dh,
          auth_key: keys.auth,
          user_agent: userAgent || null,
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update settings to reflect push enabled
    await supabase
      .from('settings')
      .upsert(
        { user_id: user.id, push_enabled: true },
        { onConflict: 'user_id' }
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
