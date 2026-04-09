import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookieStore = await cookies()
  const currentToken = cookieStore.get('finflow_session')?.value

  console.log('Current cookie token:', currentToken)

  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_blocked', false)
    .order('last_active_at', { ascending: false })

  // Mark which one is current based on cookie token
  const enriched = (sessions ?? []).map(s => ({
    ...s,
    is_current: s.session_token === currentToken,
  }))

  return NextResponse.json({ sessions: enriched })
}
