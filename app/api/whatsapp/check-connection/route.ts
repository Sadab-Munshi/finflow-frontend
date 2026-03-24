import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ connected: false, phone: null }, { status: 401 })
    }

    const { data } = await supabase
      .from('settings')
      .select('whatsapp_phone')
      .eq('user_id', user.id)
      .single()

    const phone = data?.whatsapp_phone ?? null
    const connected = !!phone

    return NextResponse.json({ connected, phone: connected ? '****' : null })
  } catch {
    return NextResponse.json({ connected: false, phone: null })
  }
}
