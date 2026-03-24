import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const authResult = await verifyAdmin(req)
  if (authResult instanceof NextResponse) return authResult

  const { data: users } = await supabase.auth.admin.listUsers()
  const { data: management } = await supabase.from('user_management').select('*')
  const { data: heartbeats } = await supabase.from('user_heartbeat').select('*')

  const combined = users?.users.map(u => {
    const mgmt = management?.find(m => m.user_id === u.id)
    const heartbeat = heartbeats?.find(h => h.user_id === u.id)
    const lastSeen = heartbeat?.last_seen ? new Date(heartbeat.last_seen) : null
    const isOnline = lastSeen ? (Date.now() - lastSeen.getTime()) < 120000 : false

    return {
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || '',
      avatar: u.user_metadata?.avatar_url || '',
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
      is_banned: u.banned_until ? true : (mgmt?.is_banned || false),
      ban_reason: mgmt?.ban_reason || '',
      ip_address: mgmt?.ip_address || '',
      city: mgmt?.city || '',
      country: mgmt?.country || '',
      device: mgmt?.device || '',
      login_count: mgmt?.login_count || 0,
      cookie_id: mgmt?.cookie_id || '',
      is_online: isOnline,
      last_seen: heartbeat?.last_seen || null,
    }
  }) || []

  return NextResponse.json({ users: combined })
}
