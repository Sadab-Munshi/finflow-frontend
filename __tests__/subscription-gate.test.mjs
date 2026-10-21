import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Transpile lib/subscription-gate.ts in memory so tests run directly with Node's native test runner
const tsSource = readFileSync(new URL('../lib/subscription-gate.ts', import.meta.url), 'utf8')
const jsCode = ts.transpileModule(tsSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const mod = await import(`data:text/javascript;base64,${Buffer.from(jsCode).toString('base64')}`)

const { evaluateFeatureGate, mapPlanIdToTier, resolveEffectiveTier } = mod

describe('Frontend Subscription Gate Engine', () => {
  const sampleFeatures = {
    advanced_analytics: {
      key: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Analytics suite',
      enabled: true,
      required_tier: 'pro',
    },
    ai_summaries: {
      key: 'ai_summaries',
      name: 'AI Summaries',
      description: 'AI insights',
      enabled: true,
      required_tier: 'premium',
    },
    telegram: {
      key: 'telegram',
      name: 'Telegram Sync',
      description: 'Telegram bot',
      enabled: false,
      required_tier: 'free',
    },
  }

  it('defaults unregistered features to enabled (free) for safe rollout', () => {
    const res = evaluateFeatureGate({
      featureKey: 'unregistered_experimental_feature',
      featuresMap: sampleFeatures,
      userTier: 'free',
    })
    assert.equal(res.allowed, true)
    assert.equal(res.enabled, true)
    assert.equal(res.requiredTier, 'free')
    assert.equal(res.reason, 'unregistered_default')
  })

  it('blocks disabled features globally even for Premium users or when subscriptions are off', () => {
    const res = evaluateFeatureGate({
      featureKey: 'telegram',
      featuresMap: sampleFeatures,
      settings: { id: 1, subscriptions_enabled: false, payments_enabled: true, trial_days: 7 },
      userTier: 'premium',
    })
    assert.equal(res.allowed, false)
    assert.equal(res.enabled, false)
    assert.equal(res.reason, 'feature_disabled')
  })

  it('enforces tier hierarchy free < pro < premium when subscriptions_enabled = true', () => {
    assert.equal(
      evaluateFeatureGate({ featureKey: 'advanced_analytics', featuresMap: sampleFeatures, userTier: 'free' }).allowed,
      false
    )
    assert.equal(
      evaluateFeatureGate({ featureKey: 'advanced_analytics', featuresMap: sampleFeatures, userTier: 'pro' }).allowed,
      true
    )
    assert.equal(
      evaluateFeatureGate({ featureKey: 'ai_summaries', featuresMap: sampleFeatures, userTier: 'pro' }).reason,
      'upgrade_required'
    )
    assert.equal(
      evaluateFeatureGate({ featureKey: 'ai_summaries', featuresMap: sampleFeatures, userTier: 'premium' }).allowed,
      true
    )
  })

  it('opens all enabled paid features when subscriptions_enabled = false', () => {
    const res = evaluateFeatureGate({
      featureKey: 'ai_summaries',
      featuresMap: sampleFeatures,
      settings: { id: 1, subscriptions_enabled: false, payments_enabled: false, trial_days: 7 },
      userTier: 'free',
    })
    assert.equal(res.allowed, true)
    assert.equal(res.reason, 'open_access')
    assert.equal(res.paymentsEnabled, false)
  })

  it('maps plans and resolves manual super-admin overrides including trial/expiry windows', () => {
    assert.equal(mapPlanIdToTier('pro_monthly'), 'pro')
    assert.equal(mapPlanIdToTier('pro_yearly'), 'premium')
    assert.equal(mapPlanIdToTier('free'), 'free')

    const now = Date.now()
    const future = new Date(now + 86_400_000).toISOString()
    const past = new Date(now - 86_400_000).toISOString()

    // Active trial override grants Premium
    assert.equal(
      resolveEffectiveTier(null, { user_id: 'u1', plan: 'premium', status: 'trialing', trial_ends_at: future, expires_at: null, reason: 'VIP' }, now),
      'premium'
    )
    // Expired trial override falls back to Free
    assert.equal(
      resolveEffectiveTier(null, { user_id: 'u1', plan: 'premium', status: 'trialing', trial_ends_at: past, expires_at: null, reason: 'VIP' }, now),
      'free'
    )
    // Cancelled override revokes underlying active subscription
    assert.equal(
      resolveEffectiveTier(
        { plan_id: 'pro_yearly', status: 'active', current_period_end: future },
        { user_id: 'u1', plan: 'premium', status: 'cancelled', trial_ends_at: null, expires_at: null, reason: 'Revoked' },
        now
      ),
      'free'
    )
  })
})
