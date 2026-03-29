import { NextRequest, NextResponse } from 'next/server'
import { buildAISummaryPrompt } from '@/lib/pdf-constants'

export async function POST(req: NextRequest) {
  const {
    month,
    firstName,
    totalIncome,
    totalExpense,
    savingsRate,
    expenseBreakdown,
    incomeBreakdown,
    prevMonthData,
    exceededBudgets,
    unusualPatterns,
    // legacy fields kept for backward compatibility
    categories,
  } = await req.json()
  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!GROQ_API_KEY) return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 })

  const savings = totalIncome - totalExpense
  const effectiveSavingsRate = savingsRate ?? (totalIncome > 0 ? (savings / totalIncome) * 100 : 0)
  const effectiveFirstName = firstName || 'User'

  // Build enriched breakdown arrays (support both new and legacy callers)
  const effectiveExpenseBreakdown: { name: string; amount: number; percentage: number }[] =
    expenseBreakdown ?? (categories ?? []).map((c: { name: string; amount: number }) => ({
      name: c.name,
      amount: c.amount,
      percentage: totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0,
    }))
  const effectiveIncomeBreakdown: { name: string; amount: number; percentage: number }[] =
    incomeBreakdown ?? []

  const prompt = buildAISummaryPrompt(
    effectiveFirstName,
    month,
    totalIncome,
    totalExpense,
    savings,
    effectiveSavingsRate,
    effectiveExpenseBreakdown,
    effectiveIncomeBreakdown,
    prevMonthData ?? null,
    exceededBudgets ?? [],
    unusualPatterns ?? []
  )

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a personal finance advisor for Indian users. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })

  const data = await response.json()
  const content = data.choices[0].message.content
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })

  const parsed = JSON.parse(jsonMatch[0])

  // Support both new structured format and legacy flat format
  if (parsed.sections) {
    return NextResponse.json(parsed)
  }
  return NextResponse.json(parsed)
}
