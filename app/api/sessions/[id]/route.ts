import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const cookieStore = await cookies()
  const currentToken = cookieStore.get('finflow_session')?.value

  // Safety check - never block your own session
  const { data: targetSession } = await supabase
    .from('user_sessions')
    .select('session_token')
    .eq('id', id)
    .single()

  if (targetSession?.session_token === currentToken) {
    return NextResponse.json(
      { error: 'Cannot log out current device from here' },
      { status: 400 }
    )
  }

  // Mark the session as blocked instead of deleting
  await supabase
    .from('user_sessions')
    .update({ is_blocked: true })
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
