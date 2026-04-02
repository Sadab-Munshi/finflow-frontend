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

  const { data: feedback } = await supabase
    .from('feedback')
    .select('id, user_id, message, type, created_at')
    .order('created_at', { ascending: false })

  if (!feedback || feedback.length === 0) {
    return NextResponse.json({ feedback: [] })
  }

  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const { data: settings } = await supabase
    .from('settings')
    .select('user_id, name')

  const emailMap: Record<string, string> = {}
  authUsers?.users.forEach(u => {
    emailMap[u.id] = u.email || ''
  })

  const nameMap: Record<string, string> = {}
  settings?.forEach(s => {
    nameMap[s.user_id] = s.name || ''
  })

  const combined = feedback.map(f => ({
    id: f.id,
    user_id: f.user_id,
    name: nameMap[f.user_id] || '',
    email: emailMap[f.user_id] || '',
    message: f.message,
    type: f.type,
    created_at: f.created_at,
  }))

  return NextResponse.json({ feedback: combined })
}
