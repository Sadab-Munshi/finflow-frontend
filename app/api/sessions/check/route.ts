import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ blocked: false })

  const cookieStore = await cookies()
  const currentToken = cookieStore.get('finflow_session')?.value

  if (!currentToken) return NextResponse.json({ blocked: true })

  const { data: session } = await supabase
    .from('user_sessions')
    .select('is_blocked')
    .eq('session_token', currentToken)
    .eq('user_id', user.id)
    .single()

  if (!session || session.is_blocked) {
    return NextResponse.json({ blocked: true })
  }

  return NextResponse.json({ blocked: false })
}
