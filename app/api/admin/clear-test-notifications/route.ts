import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const authResult = await verifyAdmin(req)
  if (authResult instanceof NextResponse) return authResult

  const { error, count } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .in('title', ['Test', 'Ok', 'test', 'ok'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 })
}
