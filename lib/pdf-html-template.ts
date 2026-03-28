import { EXPENSE_CATEGORY_COLORS, getTransactionDescription } from './pdf-constants'

export interface PdfReportData {
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
  } | null
  incomeBreakdown: { source: string; amount: number; percentage: number }[]
  expenseBreakdown: { category: string; amount: number; percentage: number }[]
  transactions: {
    date: string
    description: string
    category: string
    type: string
    amount: number
  }[]
}

function fmtINR(amount: number): string {
  return 'Rs.' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getCatColor(name: string): string {
  return EXPENSE_CATEGORY_COLORS[name] || '#6B7280'
}

function sectionTitle(title: string): string {
  return `<div style="display:flex;align-items:center;margin:20px 32px 12px">
    <div style="width:4px;height:20px;background:#0D9488;border-radius:2px;margin-right:10px"></div>
    <span style="font-size:14px;font-weight:700;color:#111827;letter-spacing:0.3px">${escapeHtml(title)}</span>
  </div>`
}

/**
 * Builds a fully styled HTML string for the PDF report.
 * Uses inline styles only — no Tailwind, no external CSS.
 */
export function buildReportHTML(data: PdfReportData, logoBase64: string): string {
  const {
    userName, month, generatedAt, totalIncome, totalExpense,
    netSavings, savingsRate, aiSummary, incomeBreakdown,
    expenseBreakdown, transactions,
  } = data

  // ── HEADER ──
  const headerHTML = `
    <div style="width:100%;background:#0D9488;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box">
      <div>
        <div style="background:#D9FAF7;border-radius:10px;padding:6px 10px;display:inline-flex;align-items:center">
          <img src="${logoBase64}" height="36" style="height:36px;display:block" />
        </div>
      </div>
      <div style="text-align:center">
        <div style="color:white;font-size:20px;font-weight:700">${escapeHtml(month)}</div>
        <div style="color:rgba(255,255,255,0.8);font-size:13px">Financial Report</div>
      </div>
      <div style="text-align:right">
        <div style="color:white;font-size:15px;font-weight:700">${escapeHtml(userName)}</div>
        <div style="color:rgba(255,255,255,0.75);font-size:12px">Generated: ${escapeHtml(generatedAt)} IST</div>
      </div>
    </div>`

  // ── CURRENCY NOTE ──
  const currencyNote = `
    <div style="text-align:right;font-size:11px;color:#6B7280;padding:6px 32px;border-bottom:1px solid #E5E7EB">
      All amounts in Indian Rupees (Rs.)
    </div>`

  // ── AI FINANCIAL SUMMARY ──
  let aiSummaryHTML = ''
  if (aiSummary) {
    const sections = [
      { label: 'A. Overall Assessment', text: aiSummary.assessment },
      { label: 'B. Spending Analysis', text: aiSummary.spendingAnalysis },
      { label: 'C. Income Analysis', text: aiSummary.incomeAnalysis },
    ]

    const sectionBlocks = sections.map(s => `
      <div style="margin-top:12px;margin-bottom:4px">
        <div style="font-weight:700;color:#0D9488;font-size:13px">${escapeHtml(s.label)}</div>
      </div>
      <div style="font-size:12.5px;color:#374151;line-height:1.7">${escapeHtml(s.text || '')}</div>
    `).join('')

    const recsHTML = (aiSummary.recommendations || []).map((r, i) => `
      <div style="font-size:12.5px;color:#374151;line-height:1.8">
        <span style="font-weight:700;color:#0D9488">${i + 1}.</span> ${escapeHtml(r)}
      </div>
    `).join('')

    aiSummaryHTML = `
      <div style="padding:24px 32px;max-height:280px;overflow:hidden">
        <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:12px">AI Financial Summary</div>
        ${sectionBlocks}
        <div style="margin-top:12px;margin-bottom:4px">
          <div style="font-weight:700;color:#0D9488;font-size:13px">D. Key Recommendations</div>
        </div>
        ${recsHTML}
      </div>`
  }

  // ── STAT BOXES ──
  const savingsNeg = netSavings < 0
  const savingsBg = savingsNeg ? '#FFF1F2' : '#ECFDF5'
  const savingsBorder = savingsNeg ? '#FECDD3' : '#6EE7B7'
  const savingsValueColor = savingsNeg ? '#E11D48' : '#047857'
  const savingsLabelColor = savingsNeg ? '#9F1239' : '#065F46'
  const badgeBg = savingsNeg ? '#FEE2E2' : '#D1FAE5'
  const badgeColor = savingsNeg ? '#991B1B' : '#065F46'
  const badgeText = savingsNeg ? 'CONCERNING DEFICIT' : 'HEALTHY SAVINGS'

  const statBoxes = `
    <div style="display:flex;gap:16px;padding:0 32px 20px">
      <div style="flex:1;background:#ECFDF5;border:1.5px solid #6EE7B7;border-radius:12px;padding:16px">
        <div style="font-size:11px;font-weight:600;color:#065F46;letter-spacing:0.5px;margin-bottom:8px">TOTAL INCOME</div>
        <div style="font-size:22px;font-weight:700;color:#047857">${fmtINR(totalIncome)}</div>
      </div>
      <div style="flex:1;background:#FFF1F2;border:1.5px solid #FECDD3;border-radius:12px;padding:16px">
        <div style="font-size:11px;font-weight:600;color:#9F1239;letter-spacing:0.5px;margin-bottom:8px">TOTAL EXPENSE</div>
        <div style="font-size:22px;font-weight:700;color:#E11D48">${fmtINR(totalExpense)}</div>
      </div>
      <div style="flex:1;background:${savingsBg};border:1.5px solid ${savingsBorder};border-radius:12px;padding:16px">
        <div style="background:${badgeBg};color:${badgeColor};font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;display:inline-block;margin-bottom:6px">${badgeText}</div>
        <div style="font-size:11px;font-weight:600;color:${savingsLabelColor};letter-spacing:0.5px">NET SAVINGS</div>
        <div style="font-size:22px;font-weight:700;color:${savingsValueColor}">${fmtINR(netSavings)}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">Savings Rate: ${savingsRate.toFixed(1)}%</div>
      </div>
    </div>`

  // ── INCOME BREAKDOWN ──
  let incomeHTML = ''
  if (incomeBreakdown.length > 0) {
    const rows = incomeBreakdown.map(src => `
      <div style="margin-bottom:12px;padding:0 32px">
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:13px;font-weight:600;color:#111827">${escapeHtml(src.source)}</span>
          <span style="font-size:13px;font-weight:600;color:#047857">${fmtINR(src.amount)}</span>
        </div>
        <div style="height:8px;background:#D1FAE5;border-radius:999px;margin:6px 0">
          <div style="height:100%;border-radius:999px;background:#0D9488;width:${src.percentage.toFixed(1)}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between">
          <div></div>
          <span style="font-size:11px;color:#6B7280">${src.percentage.toFixed(1)}%</span>
        </div>
      </div>
    `).join('')

    incomeHTML = `
      ${sectionTitle('1. INCOME BREAKDOWN BY SOURCE')}
      ${rows}`
  } else {
    incomeHTML = `
      ${sectionTitle('1. INCOME BREAKDOWN BY SOURCE')}
      <p style="color:#9CA3AF;font-style:italic;font-size:13px;padding:0 32px">No income recorded for this month</p>`
  }

  // ── EXPENSE BREAKDOWN ──
  let expenseHTML = ''
  if (expenseBreakdown.length > 0) {
    const rows = expenseBreakdown.map(cat => {
      const color = getCatColor(cat.category)
      return `
      <div style="margin-bottom:12px;padding:0 32px">
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:13px;font-weight:600;color:#111827">${escapeHtml(cat.category)}</span>
          <span style="font-size:13px;font-weight:600;color:${color}">${fmtINR(cat.amount)}</span>
        </div>
        <div style="height:8px;background:${color}26;border-radius:999px;margin:6px 0">
          <div style="height:100%;border-radius:999px;background:${color};width:${cat.percentage.toFixed(1)}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between">
          <div></div>
          <span style="font-size:11px;color:#6B7280">${cat.percentage.toFixed(1)}%</span>
        </div>
      </div>`
    }).join('')

    expenseHTML = `
      ${sectionTitle('2. EXPENSE BREAKDOWN BY CATEGORY')}
      ${rows}`
  }

  // ── TRANSACTION DETAILS TABLE ──
  const txHeaderRow = `
    <tr>
      <th style="padding:10px 12px;color:white;font-size:12px;font-weight:600;text-align:left;background:#0D9488">Date</th>
      <th style="padding:10px 12px;color:white;font-size:12px;font-weight:600;text-align:left;background:#0D9488">Description</th>
      <th style="padding:10px 12px;color:white;font-size:12px;font-weight:600;text-align:left;background:#0D9488">Category</th>
      <th style="padding:10px 12px;color:white;font-size:12px;font-weight:600;text-align:left;background:#0D9488">Type</th>
      <th style="padding:10px 12px;color:white;font-size:12px;font-weight:600;text-align:right;background:#0D9488">Amount</th>
    </tr>`

  const txRows = transactions.map((tx, i) => {
    const bgColor = i % 2 === 0 ? '#ffffff' : '#F9FAFB'
    const isIncome = tx.type === 'income'
    const typeBg = isIncome ? '#D1FAE5' : '#FEE2E2'
    const typeColor = isIncome ? '#065F46' : '#991B1B'
    const amtColor = isIncome ? '#047857' : '#E11D48'
    return `
    <tr style="background:${bgColor}">
      <td style="padding:9px 12px;font-size:12px;border-bottom:1px solid #F3F4F6;color:#374151">${escapeHtml(tx.date)}</td>
      <td style="padding:9px 12px;font-size:12px;border-bottom:1px solid #F3F4F6;color:#374151">${escapeHtml(tx.description)}</td>
      <td style="padding:9px 12px;font-size:12px;border-bottom:1px solid #F3F4F6;color:#374151">${escapeHtml(tx.category)}</td>
      <td style="padding:9px 12px;font-size:12px;border-bottom:1px solid #F3F4F6">
        <span style="background:${typeBg};color:${typeColor};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600">${escapeHtml(tx.type)}</span>
      </td>
      <td style="padding:9px 12px;font-size:12px;border-bottom:1px solid #F3F4F6;color:${amtColor};font-weight:600;text-align:right">${fmtINR(tx.amount)}</td>
    </tr>`
  }).join('')

  const transactionsHTML = `
    ${sectionTitle('3. TRANSACTION DETAILS')}
    <table style="width:calc(100% - 64px);border-collapse:collapse;margin:0 32px">
      <thead>${txHeaderRow}</thead>
      <tbody>${txRows}</tbody>
    </table>`

  // ── FOOTER (rendered at bottom of content — actual per-page footers added by jsPDF) ──
  const footerHTML = `
    <div style="border-top:1px solid #E5E7EB;padding:10px 32px;display:flex;justify-content:space-between;margin-top:24px">
      <span style="font-size:10px;color:#9CA3AF">FinFlow Financial Report · Confidential</span>
      <span style="font-size:10px;color:#9CA3AF">Generated on ${escapeHtml(generatedAt)}</span>
    </div>`

  // ── ASSEMBLE FULL HTML ──
  return `
    <div style="width:794px;font-family:'Segoe UI',Arial,sans-serif;background:white;padding:0;margin:0">
      ${headerHTML}
      ${currencyNote}
      ${aiSummaryHTML}
      ${statBoxes}
      ${incomeHTML}
      ${expenseHTML}
      ${transactionsHTML}
      ${footerHTML}
    </div>`
}
