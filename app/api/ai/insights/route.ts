import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndIncrementUsage, getFeatureDisplayName } from '@/lib/aiLimits'

export async function POST(req: NextRequest) {
  try {
    // Check rate limit using cookie-based auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const limitCheck = await checkAndIncrementUsage(user.id, 'insights')
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { 
            error: `You have reached your monthly ${getFeatureDisplayName('insights')} limit of ${limitCheck.limit}. Resets on the 1st of next month.` 
          },
          { status: 429 }
        )
      }
    }

    const { transactions } = await req.json()
    const GROQ_API_KEY = process.env.GROQ_API_KEY

    if (!GROQ_API_KEY) return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 })

    const systemPrompt = `You are a personal finance advisor for an Indian user.
Analyze their recent transactions and provide exactly 4 insights.
Return ONLY valid JSON array, no other text.
Each insight must be one of these types: tip, warning, achievement, trend.
Provide exactly one of each type.
Response format:
[
  { "type": "tip", "title": "short title", "description": "2-3 sentence actionable advice" },
  { "type": "warning", "title": "short title", "description": "2-3 sentence warning" },
  { "type": "achievement", "title": "short title", "description": "2-3 sentence positive feedback" },
  { "type": "trend", "title": "short title", "description": "2-3 sentence trend analysis" }
]`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Here are my recent transactions: ${JSON.stringify(transactions)}` }], temperature: 0.3 }),
    })

    if (!response.ok) return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })

    const data = await response.json()
    const content = data.choices[0].message.content
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (error) {
    console.error('[insights] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
