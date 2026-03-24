import { createClient } from '@supabase/supabase-js'

// Use service role client directly for admin access to ai_usage table
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const AI_LIMITS = {
  nlp: 60,
  voice: 50,
  receipt: 30,
  insights: 10,
} as const

export type AIFeature = keyof typeof AI_LIMITS

function getCurrentMonth(): string {
  return new Date().toISOString().split('T')[0].substring(0, 7) // YYYY-MM
}

export async function checkAndIncrementUsage(userId: string, feature: AIFeature): Promise<{
  allowed: boolean
  used: number
  limit: number
  remaining: number
}> {
  const month = getCurrentMonth()
  const limit = AI_LIMITS[feature]

  console.log('[AI LIMITS] Checking usage for:', { userId, feature, month })

  // Get current usage
  const { data, error: fetchError } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('month', month)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('[AI LIMITS] Fetch error:', JSON.stringify(fetchError))
  }

  const used = data?.count || 0
  console.log('[AI LIMITS] Current count:', used)

  const remaining = Math.max(0, limit - used)

  if (used >= limit) {
    console.log('[AI LIMITS] Limit reached:', used, '>=', limit)
    return { allowed: false, used, limit, remaining: 0 }
  }

  // Increment usage
  const { error: upsertError } = await supabase.from('ai_usage').upsert({
    user_id: userId,
    feature,
    month,
    count: used + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,feature,month' })

  if (upsertError) {
    console.error('[AI LIMITS] Upsert error:', JSON.stringify(upsertError))
  } else {
    console.log('[AI LIMITS] Upsert successful, new count:', used + 1)
  }

  return { allowed: true, used: used + 1, limit, remaining: remaining - 1 }
}

export async function getUsageStats(userId: string): Promise<{
  nlp: { used: number; limit: number; remaining: number }
  voice: { used: number; limit: number; remaining: number }
  receipt: { used: number; limit: number; remaining: number }
  insights: { used: number; limit: number; remaining: number }
}> {
  const month = getCurrentMonth()

  console.log('[AI LIMITS] Getting usage stats for:', { userId, month })

  const { data, error } = await supabase
    .from('ai_usage')
    .select('feature, count')
    .eq('user_id', userId)
    .eq('month', month)

  if (error) {
    console.error('[AI LIMITS] Stats fetch error:', JSON.stringify(error))
  }

  const usage: Record<string, number> = {}
  for (const row of data || []) {
    usage[row.feature] = row.count
  }

  console.log('[AI LIMITS] Raw usage data:', data)
  console.log('[AI LIMITS] Parsed usage:', usage)

  return {
    nlp: {
      used: usage.nlp || 0,
      limit: AI_LIMITS.nlp,
      remaining: Math.max(0, AI_LIMITS.nlp - (usage.nlp || 0)),
    },
    voice: {
      used: usage.voice || 0,
      limit: AI_LIMITS.voice,
      remaining: Math.max(0, AI_LIMITS.voice - (usage.voice || 0)),
    },
    receipt: {
      used: usage.receipt || 0,
      limit: AI_LIMITS.receipt,
      remaining: Math.max(0, AI_LIMITS.receipt - (usage.receipt || 0)),
    },
    insights: {
      used: usage.insights || 0,
      limit: AI_LIMITS.insights,
      remaining: Math.max(0, AI_LIMITS.insights - (usage.insights || 0)),
    },
  }
}

export function getFeatureDisplayName(feature: AIFeature): string {
  const names: Record<AIFeature, string> = {
    nlp: 'Text/NLP',
    voice: 'Voice Input',
    receipt: 'Receipt Scan',
    insights: 'AI Insights',
  }
  return names[feature]
}
