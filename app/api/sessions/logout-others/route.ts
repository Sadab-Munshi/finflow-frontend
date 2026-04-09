import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookieStore = await cookies()
  const currentToken = cookieStore.get('finflow_session')?.value

  if (!currentToken) {
    return NextResponse.json({ error: 'No current session' }, { status: 400 })
  }

  // Mark all other sessions as blocked instead of deleting
  await supabase
    .from('user_sessions')
    .update({ is_blocked: true })
    .eq('user_id', user.id)
    .neq('session_token', currentToken)

  return NextResponse.json({ success: true })
}
