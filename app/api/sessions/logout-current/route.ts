import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const currentToken = cookieStore.get('finflow_session')?.value

  if (user && currentToken) {
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', user.id)
      .eq('session_token', currentToken)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete('finflow_session')
  return response
}
