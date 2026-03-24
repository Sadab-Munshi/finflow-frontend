import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { categories } from '@/lib/categories'
import { getTodayIndianDate } from '@/lib/utils'
import { checkAndIncrementUsage, getFeatureDisplayName } from '@/lib/aiLimits'

const categoriesText = categories.map(c => `ID ${c.id}: ${c.name} (${c.type})`).join(', ')

export async function POST(req: NextRequest) {
  try {
    // Check rate limit using cookie-based auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const limitCheck = await checkAndIncrementUsage(user.id, 'receipt')
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { 
            error: `You have reached your monthly ${getFeatureDisplayName('receipt')} limit of ${limitCheck.limit}. Resets on the 1st of next month.` 
          },
          { status: 429 }
        )
      }
    }

    const { base64, mimeType } = await req.json()
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })

    const systemPrompt = `You are a receipt/document scanner for an Indian finance app.
Extract transaction data from this image/document.
Currency is INR (Indian Rupees).
Return ONLY valid JSON, no other text.
Categories available: ${categoriesText}.
Today's date is ${getTodayIndianDate()}.
For single receipt return:
{
  "transactions": [{
    "amount": number,
    "type": "expense",
    "category": string,
    "description": string,
    "date": "DD/MM/YYYY" or null,
    "confidence": number
  }]
}
For bank statement/multiple items, return multiple objects in the transactions array.`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }, { inlineData: { mimeType, data: base64 } }] }], generationConfig: { temperature: 0.1 } }),
    })

    if (!response.ok) return NextResponse.json({ error: 'Failed to parse receipt' }, { status: 500 })

    const data = await response.json()
    const content = data.candidates[0].content.parts[0].text
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[parse-receipt] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
