import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { month, totalIncome, totalExpense, categories } = await req.json()
  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!GROQ_API_KEY) return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 })

  const systemPrompt = `You are a personal finance advisor for an Indian user.
Write a brief monthly financial summary for ${month}.
Include: overall assessment, spending patterns, savings rate, one key recommendation.
Return ONLY valid JSON, no other text.
Response format: { "summary": "3-5 sentence paragraph" }`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Monthly data: Total Income: Rs.${totalIncome}, Total Expense: Rs.${totalExpense}, Top spending: ${categories.map((c: any) => `${c.name}: Rs.${c.amount}`).join(', ')}` }], temperature: 0.3 }),
  })

  if (!response.ok) return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })

  const data = await response.json()
  const content = data.choices[0].message.content
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })

  return NextResponse.json(JSON.parse(jsonMatch[0]))
}
