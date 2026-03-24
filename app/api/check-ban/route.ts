import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  
  if (!userId) return NextResponse.json({ banned: false })

  const { data, error } = await supabase
    .from('user_management')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return NextResponse.json({ 
    banned: data?.is_banned === true,
    reason: data?.ban_reason || '',
  })
}
