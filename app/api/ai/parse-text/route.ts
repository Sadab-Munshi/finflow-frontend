import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndIncrementUsage, getFeatureDisplayName } from '@/lib/aiLimits'

const systemPrompt = `You are a financial transaction parser. Extract transaction details from the user's text and return ONLY a JSON object with no extra text.

Available categories (use EXACTLY one of these):
- Food & Dining
- Transport
- Shopping
- Bills & Utilities
- Entertainment
- Health
- Education
- Rent
- Groceries
- Personal Care
- Salary
- Freelance
- Business
- Investment
- Gift
- Other

Rules:
- amount: number only, no currency symbols
- type: must be either 'income' or 'expense'
- category: must be EXACTLY one from the list above, match intelligently (e.g. 'food', 'lunch', 'dinner', 'restaurant' → 'Food & Dining', 'uber', 'auto', 'petrol', 'bus' → 'Transport', 'salary', 'payment received' → 'Salary', 'doctor', 'medicine', 'hospital' → 'Health', 'house rent', 'apartment' → 'Rent')
- date: YYYY-MM-DD format, use today if not mentioned (today is ${new Date().toISOString().split('T')[0]})
- note: brief description

Return ONLY this JSON:
{
  "amount": 500,
  "type": "expense",
  "category": "Food & Dining",
  "date": "2026-03-03",
  "note": "lunch at restaurant"
}`

export async function POST(req: NextRequest) {
  try {
    // Check rate limit using cookie-based auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const limitCheck = await checkAndIncrementUsage(user.id, 'nlp')
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { 
            error: `You have reached your monthly ${getFeatureDisplayName('nlp')} limit of ${limitCheck.limit}. Resets on the 1st of next month.` 
          },
          { status: 429 }
        )
      }
    }

    const { text } = await req.json()
    const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY

    if (!MISTRAL_API_KEY) return NextResponse.json({ error: 'Mistral API key not configured' }, { status: 500 })

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
      body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }], temperature: 0.1 }),
    })

    if (!response.ok) return NextResponse.json({ error: 'Failed to parse text' }, { status: 500 })

    const data = await response.json()
    const content = data.choices[0].message.content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })

    const parsed = JSON.parse(jsonMatch[0])

    // Capitalize first letter of note
    if (parsed.note) {
      parsed.note = parsed.note.charAt(0).toUpperCase() + parsed.note.slice(1)
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[parse-text] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
