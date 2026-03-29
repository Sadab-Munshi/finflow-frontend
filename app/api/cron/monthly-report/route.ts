import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const month = now.toLocaleString('en-IN', { month: 'long' })
  const year = now.getFullYear()

  // Fetch all active users
  const { data: users, error } = await supabase
    .from('settings')
    .select('user_id')

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ success: true, queued: 0, month, year })
  }

  // Add all users to queue
  const queueItems = users.map(u => ({
    user_id: u.user_id,
    month,
    year,
    status: 'pending'
  }))

  const { error: queueError } = await supabase
    .from('report_queue')
    .upsert(queueItems, {
      onConflict: 'user_id,month,year',
      ignoreDuplicates: true
    })

  if (queueError) {
    return NextResponse.json({ error: queueError }, { status: 500 })
  }

  console.log(`Queued ${users.length} users for ${month} ${year}`)

  return NextResponse.json({ 
    success: true, 
    queued: users.length,
    month,
    year
  })
}

// Support GET for quick curl testing
export async function GET(req: NextRequest) {
  return POST(req)
}
