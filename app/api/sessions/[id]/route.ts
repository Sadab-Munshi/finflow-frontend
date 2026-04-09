import { createClient } from '@/lib/supabase/server'
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

  await supabase
    .from('user_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // safety: only own sessions

  return NextResponse.json({ success: true })
}
