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

/** AI prompt for structured 4-section summary (FIX 2) */
export function buildAISummaryPrompt(
  monthName: string,
  totalIncome: number,
  totalExpense: number,
  savings: number,
  savingsRate: number,
  topCategories: string,
  incomeSources: string
): string {
  return `Generate a structured financial report summary for ${monthName}.
Total income: Rs.${totalIncome.toLocaleString('en-IN')}, Total expenses: Rs.${totalExpense.toLocaleString('en-IN')}, Net savings: Rs.${savings.toLocaleString('en-IN')}, Savings rate: ${savingsRate.toFixed(1)}%.
Top expense categories: ${topCategories}.
Income sources: ${incomeSources}.

You MUST return ONLY valid JSON in exactly this format (no markdown, no extra text):
{
  "sections": {
    "overall": "2-3 sentences on general financial health for the month.",
    "spending": "2-3 sentences on which categories consumed most budget. Compare to healthy spending patterns.",
    "income": "1-2 sentences on income sources and stability.",
    "recommendations": ["First specific actionable recommendation", "Second specific actionable recommendation", "Third specific actionable recommendation"]
  }
}

Rules:
- Each recommendation must be specific to the user data, not generic.
- Write in a warm professional tone as a financial advisor.
- Do NOT use markdown or special characters.
- Do NOT include any text outside the JSON object.`
}
