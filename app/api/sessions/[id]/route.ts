import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  console.log('Deleting session id:', id)

  // Fetch the session's refresh token before deleting
  const { data: target } = await supabase
    .from('user_sessions')
    .select('supabase_session_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // Revoke the Supabase auth session if we have a refresh token
  if (target?.supabase_session_id) {
    await supabaseAdmin.auth.admin.signOut(target.supabase_session_id, 'others')
  }

  await supabase
    .from('user_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // safety: only own sessions

  return NextResponse.json({ success: true })
}
