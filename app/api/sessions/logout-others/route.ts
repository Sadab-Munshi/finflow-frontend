import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookieStore = await cookies()
  const currentToken = cookieStore.get('finflow_session')?.value

  console.log('Logout others, keeping token:', currentToken)

  if (!currentToken) {
    return NextResponse.json({ error: 'No current session' }, { status: 400 })
  }

  // Fetch all other sessions with their refresh tokens
  const { data: otherSessions } = await supabase
    .from('user_sessions')
    .select('id, supabase_session_id')
    .eq('user_id', user.id)
    .neq('session_token', currentToken)

  // Revoke each Supabase auth session
  if (otherSessions) {
    for (const session of otherSessions) {
      if (session.supabase_session_id) {
        await supabaseAdmin.auth.admin.signOut(session.supabase_session_id, 'others')
      }
    }
  }

  // Delete all other session rows
  await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', user.id)
    .neq('session_token', currentToken) // keep current session

  return NextResponse.json({ success: true })
}
