// Shared constants for PDF report generation (server + client)

/** Keywords highlighted in bold teal within the AI summary paragraph */
export const AI_SUMMARY_TEAL_KEYWORDS = [
  'concerning',
  'major allocation',
  'reduce',
  'mitigate',
  'generate income',
  'deficit',
  'savings rate',
  'income',
  'expense',
  'budget',
  'investment',
  'recommendation',
]

/** Category → unique bar color for expense breakdown (FIX 4) */
export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  'Transport':        '#F97316',
  'Health':           '#0D9488',
  'Food & Dining':    '#EF4444',
  'Shopping':         '#8B5CF6',
  'Bills & Utilities':'#3B82F6',
  'Education':        '#F59E0B',
  'Entertainment':    '#EC4899',
  'Groceries':        '#10B981',
  'Personal Care':    '#6366F1',
  'Other':            '#6B7280',
}

/** Income category colours (teal shades) */
export const INCOME_CATEGORY_COLORS: Record<string, string> = {
  'Salary':     '#0D9488',
  'Freelance':  '#14B8A6',
  'Business':   '#0F766E',
  'Investment': '#115E59',
  'Gift':       '#2DD4BF',
  'Rent':       '#5EEAD4',
  'Other':      '#99F6E4',
}

/**
 * Returns a display-friendly description for a transaction.
 * Falls back to the category name when note is empty, null, or "Done".
 */
export function getTransactionDescription(
  note: string | null | undefined,
  category: string
): string {
  const trimmed = (note || '').trim()
  if (!trimmed || trimmed.toLowerCase() === 'done') {
    return category || '-'
  }
  return trimmed.replace(/\n/g, ' ')
}

/** AI prompt for structured 4-section summary — improved with full context */
export function buildAISummaryPrompt(
  firstName: string,
  monthName: string,
  totalIncome: number,
  totalExpense: number,
  savings: number,
  savingsRate: number,
  expenseBreakdown: { name: string; amount: number; percentage: number }[],
  incomeBreakdown: { name: string; amount: number; percentage: number }[],
  prevMonthData: { totalIncome: number; totalExpense: number; netSavings: number } | null,
  exceededBudgets: { category: string; budget: number; spent: number }[],
  unusualPatterns: string[]
): string {
  const expenseStr = expenseBreakdown
    .map(c => `${c.name}: Rs.${c.amount.toLocaleString('en-IN')} (${c.percentage.toFixed(1)}%)`)
    .join(', ')
  const incomeStr = incomeBreakdown
    .map(i => `${i.name}: Rs.${i.amount.toLocaleString('en-IN')} (${i.percentage.toFixed(1)}%)`)
    .join(', ')

  let prevMonthStr = 'No previous month data available.'
  if (prevMonthData) {
    const incChg = prevMonthData.totalIncome > 0
      ? (((totalIncome - prevMonthData.totalIncome) / prevMonthData.totalIncome) * 100).toFixed(1)
      : 'N/A'
    const expChg = prevMonthData.totalExpense > 0
      ? (((totalExpense - prevMonthData.totalExpense) / prevMonthData.totalExpense) * 100).toFixed(1)
      : 'N/A'
    prevMonthStr = `Previous month: income Rs.${prevMonthData.totalIncome.toLocaleString('en-IN')}, expenses Rs.${prevMonthData.totalExpense.toLocaleString('en-IN')}, savings Rs.${prevMonthData.netSavings.toLocaleString('en-IN')}. Income change: ${incChg}%, Expense change: ${expChg}%.`
  }

  const budgetStr = exceededBudgets.length > 0
    ? `Exceeded budgets: ${exceededBudgets.map(b => `${b.category} (spent Rs.${b.spent.toLocaleString('en-IN')} vs budget Rs.${b.budget.toLocaleString('en-IN')})`).join(', ')}.`
    : 'No budgets exceeded.'

  const patternsStr = unusualPatterns.length > 0
    ? `Unusual patterns: ${unusualPatterns.join('; ')}.`
    : ''

  return `Generate a structured financial report summary for ${firstName} for ${monthName}.

Financial data:
- Total income: Rs.${totalIncome.toLocaleString('en-IN')}, Total expenses: Rs.${totalExpense.toLocaleString('en-IN')}, Net savings: Rs.${savings.toLocaleString('en-IN')}, Savings rate: ${savingsRate.toFixed(1)}%.
- Expense breakdown: ${expenseStr || 'No expenses'}.
- Income sources: ${incomeStr || 'No income'}.
- ${prevMonthStr}
- ${budgetStr}${patternsStr ? `\n- ${patternsStr}` : ''}

You MUST return ONLY valid JSON in exactly this format (no markdown, no extra text):
{
  "sections": {
    "overall": "2-3 sentences on general financial health using actual amounts and percentages.",
    "spending": "2-3 sentences naming specific categories by name that consumed most budget, comparing to last month where available.",
    "income": "1-2 sentences on income sources and stability.",
    "recommendations": ["First specific recommendation tied to actual data", "Second specific recommendation tied to actual data", "Third specific recommendation tied to actual data"]
  }
}

Rules:
1. Use ${firstName}'s name ONLY in section overall (once).
2. Be SPECIFIC - use actual category names, amounts and percentages from the data.
3. Compare with last month where data is available; skip comparison if no previous month data.
4. Mention unusual patterns if any detected.
5. Keep each section to 2-3 sentences maximum.
6. Do NOT give generic advice - tie all recommendations to the actual spending data provided.
7. Do NOT use emojis or special characters.
8. Maximum 3 recommendations.
9. If a budget was exceeded, mention the specific category in recommendations.
10. Write in a warm professional tone as a financial advisor for Indian users.
11. Do NOT include any text outside the JSON object.`
}
