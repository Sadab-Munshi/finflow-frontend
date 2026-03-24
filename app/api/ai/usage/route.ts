import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUsageStats } from '@/lib/aiLimits'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stats = await getUsageStats(user.id)
    return NextResponse.json(stats)
  } catch (err) {
    console.error('AI usage error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
