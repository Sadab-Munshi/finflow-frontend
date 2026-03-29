# FinFlow — Auto Monthly Report Generation & Storage

## OVERVIEW
Instead of generating PDF every time user clicks download,
generate reports automatically on 1st of each month,
save to Supabase Storage, and let users download instantly.

---

## STEP 1 — SUPABASE SETUP

### Create reports table
```sql
create table reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  month text not null,
  year integer not null,
  pdf_url text not null,
  generated_at timestamptz default now(),
  file_size integer,
  unique(user_id, month, year)
);

-- Enable RLS
alter table reports enable row level security;

-- Users can only see their own reports
create policy "Users can view own reports"
  on reports for select
  using (auth.uid() = user_id);
```

### Create Supabase Storage bucket
```
Bucket name: reports
Public: false (private, authenticated access only)
File size limit: 10MB
Allowed types: application/pdf
```

---

## STEP 2 — UPDATE CRON JOB

File: `app/api/cron/monthly-report/route.ts`

This cron job already runs on 1st of each month.
Add PDF generation and storage to it.

### Current flow:
- Fetches user data
- Sends email report

### New flow (add after email):
1. Generate PDF for the month
2. Upload to Supabase Storage
3. Save URL to reports table

### Code to add after email sending:

```typescript
// After sending email, generate and store PDF
for (const user of users) {
  try {
    // 1. Build report data (reuse existing data fetch)
    const reportData = {
      userName: user.name,
      month: monthName,
      year: currentYear,
      generatedAt: new Date().toISOString(),
      totalIncome: user.totalIncome,
      totalExpense: user.totalExpense,
      netSavings: user.netSavings,
      savingsRate: user.savingsRate,
      aiSummary: user.aiSummary, // already generated for email
      incomeBreakdown: user.incomeBreakdown,
      expenseBreakdown: user.expenseBreakdown,
      budgetStatus: user.budgetStatus,
      transactions: user.transactions,
      previousMonth: user.previousMonth
    }

    // 2. Generate PDF buffer
    const pdfBuffer = await generatePDFBuffer(reportData)

    // 3. Upload to Supabase Storage
    const fileName = `${user.id}/${currentYear}-${monthNumber}.pdf`
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    // 4. Get signed URL (valid for 1 year)
    const { data: urlData } = await supabase
      .storage
      .from('reports')
      .createSignedUrl(fileName, 365 * 24 * 60 * 60)

    // 5. Save to reports table
    await supabase
      .from('reports')
      .upsert({
        user_id: user.id,
        month: monthName,
        year: currentYear,
        pdf_url: urlData.signedUrl,
        file_size: pdfBuffer.length
      }, {
        onConflict: 'user_id, month, year'
      })

    console.log(`Report saved for user ${user.id}`)

  } catch (error) {
    console.error(`Report generation failed for ${user.id}:`, error)
    // Don't throw — continue for other users
    continue
  }
}
```

---

## STEP 3 — PDF BUFFER FUNCTION

Create `lib/generatePDFBuffer.ts`

This is a server-side version of PDF generation
that returns a Buffer instead of triggering download.

```typescript
export async function generatePDFBuffer(data: ReportData): Promise<Buffer> {
  // Use existing PDF generation logic
  // But instead of doc.save(filename)
  // Use: return Buffer.from(doc.output('arraybuffer'))
  
  // If using jsPDF:
  const doc = buildPDFDocument(data) // your existing function
  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}
```

---

## STEP 4 — REPORTS API ROUTE

Create `app/api/reports/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET — fetch all reports for current user
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) return Response.json({ error }, { status: 500 })

  return Response.json({ reports: data })
}
```

---

## STEP 5 — REPORTS PAGE REDESIGN

File: `app/reports/page.tsx`

### Remove completely:
- Current single month card
- Download PDF button that triggers AI
- Generate AI Summary button
- Category breakdown section
- View Details toggle

### New page structure:

```
Monthly Reports
│
├── Page header: "Monthly Reports"
│   Subtitle: "Your financial reports are generated 
│   automatically on the 1st of each month"
│
├── If reports exist:
│   List of report cards, newest first
│   Each card:
│   ┌─────────────────────────────────────┐
│   │ 📄 March 2026                       │
│   │ Generated: 1 Apr 2026, 12:00 am    │
│   │ [████████] 245 KB                  │
│   │              [↓ Download PDF]       │
│   └─────────────────────────────────────┘
│
├── If no reports yet:
│   Empty state card:
│   Calendar icon
│   "No reports yet"
│   "Your first report will be automatically
│    generated on 1st April 2026"
│
└── Info banner at bottom:
    "Reports are generated on the 1st of each
     month and include your complete financial
     summary with AI insights."
```

### Report card component:
```tsx
<div className="bg-white rounded-2xl shadow-sm p-4 mb-3
  flex items-center justify-between">
  
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-teal-50 rounded-xl
      flex items-center justify-center">
      <FileText className="w-5 h-5 text-teal-600" />
    </div>
    <div>
      <p className="font-semibold text-gray-800">
        {report.month} {report.year}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">
        Generated {formatDate(report.generated_at)}
      </p>
      <p className="text-xs text-gray-400">
        {formatFileSize(report.file_size)}
      </p>
    </div>
  </div>

  <button
    onClick={() => handleDownload(report)}
    className="flex items-center gap-2 bg-teal-600 
    hover:bg-teal-700 text-white rounded-xl 
    px-4 py-2 text-sm font-medium transition-colors"
  >
    <Download className="w-4 h-4" />
    Download
  </button>
</div>
```

### Download handler (instant, no AI):
```typescript
const handleDownload = async (report: Report) => {
  try {
    setDownloadingId(report.id)
    
    // Direct download from Supabase Storage URL
    const response = await fetch(report.pdf_url)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `FinFlow-Report-${report.month}-${report.year}.pdf`
    a.click()
    
    URL.revokeObjectURL(url)
    toast.success('Report downloaded!')
    
  } catch (error) {
    toast.error('Download failed. Try again.')
  } finally {
    setDownloadingId(null)
  }
}
```

### Empty state component:
```tsx
{reports.length === 0 && (
  <div className="bg-white rounded-2xl p-8 
  text-center shadow-sm">
    <div className="w-16 h-16 bg-teal-50 rounded-full 
    flex items-center justify-center mx-auto mb-4">
      <Calendar className="w-8 h-8 text-teal-600" />
    </div>
    <h3 className="font-semibold text-gray-800 mb-2">
      No reports yet
    </h3>
    <p className="text-sm text-gray-500 leading-relaxed">
      Your first report will be automatically 
      generated on 1st {nextMonthName} {nextYear}
    </p>
  </div>
)}
```

### Info banner:
```tsx
<div className="bg-teal-50 border border-teal-100 
rounded-2xl p-4 mt-4 flex items-start gap-3">
  <Info className="w-5 h-5 text-teal-600 
  shrink-0 mt-0.5" />
  <p className="text-sm text-teal-700 leading-relaxed">
    Reports are automatically generated on the 
    1st of each month and include your complete 
    financial summary with AI-powered insights.
  </p>
</div>
```

---



---

## ICONS NEEDED
```typescript
import { 
  FileText, Download, Calendar, 
  Info, ChevronRight 
} from 'lucide-react'
```

---

## SUMMARY OF CHANGES

### Remove:
- On-demand PDF generation from client
- Generate AI Summary button
- AI call on every download click

### Add:
- reports table in Supabase
- reports storage bucket
- PDF generation in cron job
- Instant download from storage
- Report history list page
- Empty state for new users

### Result:
- AI runs ONCE per month per user (not every click)
- Downloads are instant
- Users have full report history
- No wasted AI credits
