# FinFlow PDF Report — Complete Fix Guide

## ROOT CAUSE
The current PDF library cannot render images, colors, 
or styled boxes. It only outputs plain text.

## SOLUTION — Switch to HTML-to-PDF

Use `html2canvas` + `jsPDF` OR `puppeteer` to convert
a styled HTML string into a PDF. This approach supports:
- Images and logos
- Colors and backgrounds  
- Custom fonts
- Any CSS layout

---

## STEP 1 — Install Required Package

```bash
npm install html2canvas jspdf
```

---

## STEP 2 — Create HTML Template Function

Create a new file: `lib/generatePDF.ts`

This function takes report data and returns
a fully styled HTML string, then converts to PDF.

### Function signature:
```
generatePDF(data: {
  userName: string
  month: string
  generatedAt: string
  totalIncome: number
  totalExpense: number
  netSavings: number
  savingsRate: number
  aiSummary: {
    assessment: string
    spendingAnalysis: string
    incomeAnalysis: string
    recommendations: string[]
  }
  incomeBreakdown: { source: string, amount: number, percentage: number }[]
  expenseBreakdown: { category: string, amount: number, percentage: number }[]
  transactions: { 
    date: string, 
    description: string, 
    category: string, 
    type: string, 
    amount: number 
  }[]
})
```

---

## STEP 3 — HTML TEMPLATE STRUCTURE

Build this HTML string inside the function.
Use inline styles only — no Tailwind, no external CSS.

### PAGE LAYOUT
```
A4 width: 794px
Font family: 'Segoe UI', Arial, sans-serif
Background: white
Padding: 0
Margin: 0
```

---

### HEADER (Page 1 only)
```
Full width div
Background: #0D9488
Padding: 16px 32px
Display: flex, justify-content: space-between
Align-items: center

LEFT SIDE:
  Container div:
    Background: #D9FAF7
    Border-radius: 10px
    Padding: 6px 10px
    Display: inline-flex
  Inside: <img src="report-logo.png" height="36px">
  
  IMPORTANT FOR LOGO:
  Convert logo to base64 string before injecting into HTML.
  Use fs.readFileSync('/images/report-logo.png') 
  Convert to base64: buffer.toString('base64')
  Use as: <img src="data:image/png;base64,{base64string}">
  This is the ONLY way logos work in HTML-to-PDF.

CENTER:
  <div style="text-align:center">
    <div style="color:white;font-size:20px;font-weight:700">
      {month}
    </div>
    <div style="color:rgba(255,255,255,0.8);font-size:13px">
      Financial Report
    </div>
  </div>

RIGHT SIDE:
  <div style="text-align:right">
    <div style="color:white;font-size:15px;font-weight:700">
      {userName}
    </div>
    <div style="color:rgba(255,255,255,0.75);font-size:12px">
      Generated: {generatedAt} IST
    </div>
  </div>
```

---

### CURRENCY NOTE
```
<div style="text-align:right;font-size:11px;
color:#6B7280;padding:6px 32px;
border-bottom:1px solid #E5E7EB">
  All amounts in Indian Rupees (Rs.)
</div>
```

---

### AI FINANCIAL SUMMARY
```
Container: padding 24px 32px

Title: 
  font-size:18px font-weight:700 color:#111827
  margin-bottom:12px

Sections A B C D:
  Each section:
    Section label (A. Overall Assessment):
      font-weight:700 color:#0D9488 font-size:13px
      margin-bottom:4px margin-top:12px
    
    Section text:
      font-size:12.5px color:#374151 
      line-height:1.7

Section D — Recommendations:
  Numbered list:
    Each point: font-size:12.5px color:#374151
    Number: bold teal (#0D9488)
    Line height: 1.8

NO colored keywords inside sentences.
Plain readable text only.
Keep entire AI summary within maximum 280px height.
If summary is too long, truncate with "..."
```

---

### STAT BOXES ROW
```
Container:
  display:flex gap:16px padding:0 32px 20px
  
Box 1 — Total Income:
  flex:1 background:#ECFDF5 
  border:1.5px solid #6EE7B7
  border-radius:12px padding:16px
  
  Label: "TOTAL INCOME"
    font-size:11px font-weight:600
    color:#065F46 letter-spacing:0.5px
    margin-bottom:8px
    
  Value: "Rs.{amount}"
    font-size:22px font-weight:700
    color:#047857

Box 2 — Total Expense:
  flex:1 background:#FFF1F2
  border:1.5px solid #FECDD3
  border-radius:12px padding:16px
  
  Label: "TOTAL EXPENSE"
    font-size:11px font-weight:600
    color:#9F1239 letter-spacing:0.5px
    margin-bottom:8px
    
  Value: "Rs.{amount}"
    font-size:22px font-weight:700
    color:#E11D48

Box 3 — Net Savings:
  flex:1 padding:16px border-radius:12px
  
  If negative:
    background:#FFF1F2 border:1.5px solid #FECDD3
    Badge pill: background:#FEE2E2 color:#991B1B
      font-size:10px font-weight:700 padding:2px 8px
      border-radius:999px margin-bottom:6px
      text: "CONCERNING DEFICIT"
    Value color: #E11D48
    
  If positive:
    background:#ECFDF5 border:1.5px solid #6EE7B7
    Badge pill: background:#D1FAE5 color:#065F46
      font-size:10px font-weight:700 padding:2px 8px
      border-radius:999px margin-bottom:6px
      text: "HEALTHY SAVINGS"
    Value color: #047857
  
  Label: "NET SAVINGS"
    font-size:11px font-weight:600 letter-spacing:0.5px
    
  Value: "Rs.{amount}"
    font-size:22px font-weight:700
    
  Savings Rate: "Savings Rate: {rate}%"
    font-size:11px color:#6B7280 margin-top:4px
```

---

### SECTION TITLE STYLE (reuse for all sections)
```
<div style="display:flex;align-items:center;
margin:20px 32px 12px">
  <div style="width:4px;height:20px;
  background:#0D9488;border-radius:2px;
  margin-right:10px"></div>
  <span style="font-size:14px;font-weight:700;
  color:#111827;letter-spacing:0.3px">
    {SECTION TITLE}
  </span>
</div>
```

---

### INCOME BREAKDOWN SECTION
```
Section title: "1. INCOME BREAKDOWN BY SOURCE"

Container: padding 0 32px

Each source row:
  margin-bottom:12px
  
  Row top: display flex justify-between
    Source name: font-size:13px font-weight:600 color:#111827
    Amount: font-size:13px font-weight:600 color:#047857
  
  Progress bar container:
    height:8px background:#D1FAE5 border-radius:999px
    margin:6px 0
    
    Filled bar:
      height:100% border-radius:999px
      background:#0D9488
      width: {percentage}%
  
  Row bottom: display flex justify-between
    Empty div
    Percentage: font-size:11px color:#6B7280

If no income:
  <p style="color:#9CA3AF;font-style:italic;
  font-size:13px;padding:0 32px">
    No income recorded for this month
  </p>
```

---

### EXPENSE BREAKDOWN SECTION
```
Section title: "2. EXPENSE BREAKDOWN BY CATEGORY"

Category color map (use these exact colors):
  Transport:        #F97316
  Health:           #0D9488
  Food & Dining:    #EF4444
  Shopping:         #8B5CF6
  Bills & Utilities:#3B82F6
  Education:        #F59E0B
  Entertainment:    #EC4899
  Groceries:        #10B981
  Personal Care:    #6366F1
  Other:            #6B7280

Each category row (same layout as income):
  Source name in dark
  Colored progress bar using category color
  Bar background: category color at 15% opacity
    (use hex + "26" for 15% opacity e.g. #F9731626)
  Percentage right-aligned
  Amount in category color below bar
```

---

### TRANSACTION DETAILS SECTION
```
Section title: "3. TRANSACTION DETAILS"

Table: width 100% border-collapse:collapse
Margin: 0 32px, width calc(100% - 64px)

Header row:
  background:#0D9488
  Each th: padding:10px 12px color:white
    font-size:12px font-weight:600
    text-align:left
  Columns: Date | Description | Category | Type | Amount

Data rows:
  Alternating: odd=white, even=#F9FAFB
  Each td: padding:9px 12px font-size:12px
    border-bottom:1px solid #F3F4F6
  
  Description cell:
    if note empty or "Done": show category name
    color:#374151
    
  Type cell:
    Pill badge span:
      expense: background:#FEE2E2 color:#991B1B
      income: background:#D1FAE5 color:#065F46
      padding:2px 8px border-radius:999px
      font-size:11px font-weight:600
      
  Amount cell:
    expense: color:#E11D48 font-weight:600
    income: color:#047857 font-weight:600
    text-align:right
```

---

### FOOTER
```
Position: at very bottom of each page
Border-top: 1px solid #E5E7EB
Padding: 10px 32px
Display: flex justify-between

Left: "FinFlow Financial Report · Confidential"
  font-size:10px color:#9CA3AF

Right: "Generated on {date} · Page {n}"
  font-size:10px color:#9CA3AF
```

---

## STEP 4 — CONVERT HTML TO PDF

```javascript
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

async function htmlToPDF(htmlString: string, filename: string) {
  // Create hidden container
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.width = '794px'
  container.innerHTML = htmlString
  document.body.appendChild(container)

  // Convert to canvas
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff'
  })

  // Convert to PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: 'a4'
  })

  const imgData = canvas.toDataURL('image/png')
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(filename)

  document.body.removeChild(container)
}
```

---

## STEP 5 — LOGO AS BASE64

Before building HTML, convert logo to base64:

```javascript
// In Next.js API route or server component:
import fs from 'fs'
import path from 'path'

const logoPath = path.join(process.cwd(), 'public/images/report-logo.png')
const logoBuffer = fs.readFileSync(logoPath)
const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`

// Then in HTML template:
// <img src="${logoBase64}" height="36">
```

---

## WHAT TO REMOVE FROM OLD PDF CODE
- All previous jsPDF text-only generation
- Any doc.text() calls for layout
- Placeholder icon characters
- Duplicate net savings banner

## WHAT STAYS SAME
- AI summary generation API call
- Data fetching from Supabase
- Download trigger logic
- Filename: FinFlow-Report-{Month}-{Year}.pdf
