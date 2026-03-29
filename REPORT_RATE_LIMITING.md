# FinFlow — Rate Limited Reports (Vercel Free Tier)

## CONSTRAINT
Vercel hobby plan: 10 second function timeout.
Cannot use delays or long loops in one function.

## SOLUTION — Two Cron Jobs

### Cron Job 1 — Queue Builder
Runs: 1st of every month at midnight
Job: Just adds all users to queue. Fast, under 10 seconds.

### Cron Job 2 — Queue Processor  
Runs: Every minute
Job: Picks 15 pending users, processes them, marks done.
Each run finishes well under 10 seconds.

---

## STEP 1 — CREATE QUEUE TABLE IN SUPABASE

```sql
create table report_queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  month text not null,
  year integer not null,
  status text default 'pending',
  created_at timestamptz default now(),
  processed_at timestamptz,
  error text
);
```

---

## STEP 2 — UPDATE EXISTING CRON JOB

File: `app/api/cron/monthly-report/route.ts`

Change this job to ONLY add users to queue.
Remove all AI calls, PDF generation, email sending from here.

```typescript
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const month = now.toLocaleString('en-IN', { month: 'long' })
  const year = now.getFullYear()

  // Fetch all active users
  const { data: users, error } = await supabase
    .from('settings')
    .select('user_id')

  if (error) {
    return Response.json({ error }, { status: 500 })
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
      onConflict: 'user_id, month, year',
      ignoreDuplicates: true
    })

  if (queueError) {
    return Response.json({ error: queueError }, { status: 500 })
  }

  console.log(`Queued ${users.length} users for ${month} ${year}`)

  return Response.json({ 
    success: true, 
    queued: users.length,
    month,
    year
  })
}
```

---

## STEP 3 — CREATE NEW PROCESSOR CRON JOB

File: `app/api/cron/process-report-queue/route.ts`

This runs every minute and processes 15 users at a time.

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BATCH_SIZE = 15

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pick 15 pending users from queue
  const { data: batch, error } = await supabase
    .from('report_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    return Response.json({ error }, { status: 500 })
  }

  if (!batch || batch.length === 0) {
    console.log('Queue is empty. Nothing to process.')
    return Response.json({ success: true, processed: 0 })
  }

  console.log(`Processing ${batch.length} users from queue`)

  // Mark batch as processing to prevent duplicate processing
  await supabase
    .from('report_queue')
    .update({ status: 'processing' })
    .in('id', batch.map(b => b.id))

  // Process all 15 users in parallel
  const results = await Promise.allSettled(
    batch.map(item => processUserReport(item))
  )

  // Update status based on results
  for (let i = 0; i < batch.length; i++) {
    const result = results[i]
    const item = batch[i]

    if (result.status === 'fulfilled') {
      await supabase
        .from('report_queue')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', item.id)
    } else {
      await supabase
        .from('report_queue')
        .update({ 
          status: 'failed',
          error: result.reason?.message || 'Unknown error',
          processed_at: new Date().toISOString()
        })
        .eq('id', item.id)
      
      console.error(`Failed for user ${item.user_id}:`, result.reason)
    }
  }

  const completed = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`Batch done: ${completed} completed, ${failed} failed`)

  return Response.json({ 
    success: true, 
    processed: completed,
    failed
  })
}

async function processUserReport(queueItem: QueueItem) {
  const { user_id, month, year } = queueItem

  // 1. Fetch user data from Supabase
  // (reuse existing data fetching logic)

  // 2. Generate AI summary
  // (reuse existing AI call)

  // 3. Send email
  // (reuse existing email logic)

  // 4. Generate PDF buffer
  // (reuse existing PDF generation)

  // 5. Upload PDF to Supabase Storage
  const fileName = `${user_id}/${year}-${month}.pdf`
  
  const { error: uploadError } = await supabase
    .storage
    .from('reports')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    })

  if (uploadError) throw uploadError

  // 6. Get signed URL valid for 1 year
  const { data: urlData } = await supabase
    .storage
    .from('reports')
    .createSignedUrl(fileName, 365 * 24 * 60 * 60)

  // 7. Save to reports table
  await supabase
    .from('reports')
    .upsert({
      user_id,
      month,
      year,
      pdf_url: urlData.signedUrl,
      file_size: pdfBuffer.length
    }, {
      onConflict: 'user_id, month, year'
    })
}
```

---

## STEP 4 — ADD TO VERCEL CRON CONFIG

File: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-report",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/process-report-queue",
      "schedule": "* * * * *"
    }
  ]
}
```

Second cron runs every minute automatically.
Stops doing work when queue is empty.

---

## HOW IT WORKS

```
1st of month, midnight:
  monthly-report cron runs
  → Adds 500 users to queue (2 seconds) ✅

Every minute after:
  process-report-queue runs
  → Picks 15 pending users
  → Processes them (AI + email + PDF)
  → Marks completed
  → Finishes in ~8 seconds ✅

After ~34 minutes:
  All 500 users processed ✅
  Queue empty
  Processor cron finds nothing to do
```

---

## RATE LIMIT MATH
```
15 users per minute
1 AI call per user
= 15 AI calls/minute

Well within all provider limits ✅
Vercel 10s timeout respected ✅
No manual intervention needed ✅
```

---

## TESTING IN TERMUX

### Step 1 — Trigger queue builder manually:
```bash
curl -X POST https://app.sadabmunshi.online/api/cron/monthly-report \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -w "\nStatus: %{http_code}\n"
```
Expected: `{"success":true,"queued":1,"month":"March","year":2026}`

### Step 2 — Trigger processor manually:
```bash
curl -X POST https://app.sadabmunshi.online/api/cron/process-report-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -w "\nStatus: %{http_code}\n"
```
Expected: `{"success":true,"processed":1,"failed":0}`

### Step 3 — Check Supabase:
```
Table Editor → report_queue → status = completed
Storage → reports → your PDF file exists
Table Editor → reports → pdf_url saved
```
