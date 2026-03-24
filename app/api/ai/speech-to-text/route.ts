import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndIncrementUsage, getFeatureDisplayName } from '@/lib/aiLimits'

export async function POST(req: NextRequest) {
  try {
    // Check rate limit using cookie-based auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const limitCheck = await checkAndIncrementUsage(user.id, 'voice')
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { 
            error: `You have reached your monthly ${getFeatureDisplayName('voice')} limit of ${limitCheck.limit}. Resets on the 1st of next month.` 
          },
          { status: 429 }
        )
      }
    }

    const SARVAM_API_KEY = process.env.SARVAM_API_KEY
    if (!SARVAM_API_KEY) return NextResponse.json({ error: 'Sarvam API key not configured' }, { status: 500 })

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    if (!audioFile) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })

    const sarvamForm = new FormData()
    sarvamForm.append('file', new Blob([await audioFile.arrayBuffer()], { type: 'audio/wav' }), 'recording.wav')
    sarvamForm.append('model', 'saaras:v2.5')

    const response = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
      method: 'POST',
      headers: { 'api-subscription-key': SARVAM_API_KEY },
      body: sarvamForm,
    })

    const responseText = await response.text()

    if (!response.ok) return NextResponse.json({ error: 'Sarvam API failed', details: responseText }, { status: 500 })

    const transcript = JSON.parse(responseText).transcript

    // Pass transcript to parse-text for processing
    const parseResponse = await fetch(new URL('/api/ai/parse-text', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: transcript })
    })

    if (!parseResponse.ok) return NextResponse.json({ error: 'Failed to parse transcript' }, { status: 500 })

    const parsed = await parseResponse.json()
    return NextResponse.json({ transcript, parsed })
  } catch (error) {
    console.error('[speech-to-text] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
