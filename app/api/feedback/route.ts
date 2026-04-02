import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const feedbackSchema = z.object({
  message: z.string().min(1).max(500),
  type: z.enum(['general', 'bug', 'feature', 'other']),
})

const RATE_LIMIT = 3
const RATE_WINDOW_HOURS = 24

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const parsed = feedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { message, type } = parsed.data

    // Rate limit: max 3 feedbacks per 24 hours
    const windowStart = new Date(Date.now() - RATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', windowStart)

    if (countError) {
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    if ((count ?? 0) >= RATE_LIMIT) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { error: insertError } = await supabase
      .from('feedback')
      .insert({ user_id: user.id, message, type })

    if (insertError) {
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
