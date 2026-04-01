import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-auth'

const PERMANENT_BAN_DURATION = '876600h' // ~100 years

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const authResult = await verifyAdmin(req)
  if (authResult instanceof NextResponse) return authResult

  const { userId, action, reason, ipAddress } = await req.json()

  if (action === 'ban') {
    await supabase.auth.admin.updateUserById(userId, { ban_duration: PERMANENT_BAN_DURATION })
    await supabase.from('user_management').upsert({
      user_id: userId,
      is_banned: true,
      ban_reason: reason || 'Banned by admin',
      banned_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  if (action === 'unban') {
    await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    await supabase.from('user_management').update({
      is_banned: false,
      ip_banned: false,
      ban_reason: null,
      banned_at: null,
    }).eq('user_id', userId)
  }

  if (action === 'ip_ban') {
    // Find all users with this IP address
    const { data: ipUsers } = await supabase
      .from('user_management')
      .select('user_id')
      .eq('ip_address', ipAddress)

    // Ban each user at the auth level so their sessions are invalidated
    if (ipUsers && ipUsers.length > 0) {
      for (const u of ipUsers) {
        await supabase.auth.admin.updateUserById(u.user_id, { ban_duration: PERMANENT_BAN_DURATION })
      }
    }

    // Mark all users with this IP as both ip_banned and is_banned
    await supabase.from('user_management').update({
      ip_banned: true,
      is_banned: true,
      ban_reason: reason || 'IP banned by admin',
      banned_at: new Date().toISOString(),
    }).eq('ip_address', ipAddress)
  }

  return NextResponse.json({ ok: true })
}
