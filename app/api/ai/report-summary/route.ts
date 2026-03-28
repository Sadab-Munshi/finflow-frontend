import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { month, totalIncome, totalExpense, categories, prompt: _legacyPrompt } = await req.json()
  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!GROQ_API_KEY) return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 })

  // Build structured 4-section prompt (FIX 2)
  const topCatStr = categories.map((c: any) => `${c.name}: Rs.${c.amount}`).join(', ')

  const systemPrompt = `You are a personal finance advisor for an Indian user.
Generate a structured financial report summary for ${month}.
Return ONLY valid JSON, no other text.
Response format:
{
  "sections": {
    "overall": "2-3 sentences on general financial health.",
    "spending": "2-3 sentences on spending patterns.",
    "income": "1-2 sentences on income sources.",
    "recommendations": ["Specific recommendation 1", "Specific recommendation 2", "Specific recommendation 3"]
  }
}`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Monthly data: Total Income: Rs.${totalIncome}, Total Expense: Rs.${totalExpense}, Top spending: ${topCatStr}` }], temperature: 0.3 }),
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
  // Fallback: legacy { "summary": "..." } format
  return NextResponse.json(parsed)
}
