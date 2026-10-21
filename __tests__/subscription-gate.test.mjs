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

const {
  evaluateFeatureGate,
  mapPlanIdToTier,
  resolveEffectiveTier,
  normalizeTier,
  TIER_DISPLAY_NAMES,
} = mod

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
      required_tier: 'max',
    },
    telegram: {
      key: 'telegram',
      name: 'Telegram Sync',
      description: 'Telegram bot',
      enabled: false,
      required_tier: 'free',
    },
  }

  it('exposes Free / Pro / Max display names and normalizes legacy premium to max', () => {
    assert.deepEqual(TIER_DISPLAY_NAMES, {
      free: 'Free',
      pro: 'Pro',
      max: 'Max',
    })
    assert.equal(normalizeTier('max'), 'max')
    assert.equal(normalizeTier('premium'), 'max')
    assert.equal(normalizeTier('pro'), 'pro')
    assert.equal(normalizeTier('free'), 'free')
  })

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

  it('blocks disabled features globally even for Max users or when subscriptions are off', () => {
    const res = evaluateFeatureGate({
      featureKey: 'telegram',
      featuresMap: sampleFeatures,
      settings: {
        id: 1,
        subscriptions_enabled: false,
        payments_enabled: true,
        trial_enabled: true,
        trial_days: 7,
      },
      userTier: 'max',
    })
    assert.equal(res.allowed, false)
    assert.equal(res.enabled, false)
    assert.equal(res.reason, 'feature_disabled')
  })

  it('enforces tier hierarchy free < pro < max when subscriptions_enabled = true', () => {
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
      evaluateFeatureGate({ featureKey: 'ai_summaries', featuresMap: sampleFeatures, userTier: 'max' }).allowed,
      true
    )
  })

  it('opens all enabled paid features when subscriptions_enabled = false', () => {
    const res = evaluateFeatureGate({
      featureKey: 'ai_summaries',
      featuresMap: sampleFeatures,
      settings: {
        id: 1,
        subscriptions_enabled: false,
        payments_enabled: false,
        trial_enabled: false,
        trial_days: 7,
      },
      userTier: 'free',
    })
    assert.equal(res.allowed, true)
    assert.equal(res.reason, 'open_access')
    assert.equal(res.paymentsEnabled, false)
  })

  it('maps plans and resolves manual super-admin overrides including trial/expiry windows', () => {
    assert.equal(mapPlanIdToTier('pro_monthly'), 'pro')
    assert.equal(mapPlanIdToTier('pro_yearly'), 'max')
    assert.equal(mapPlanIdToTier('free'), 'free')

    const now = Date.now()
    const future = new Date(now + 86_400_000).toISOString()
    const past = new Date(now - 86_400_000).toISOString()

    // Active trial override (including legacy 'premium') grants Max
    assert.equal(
      resolveEffectiveTier(
        null,
        { user_id: 'u1', plan: 'premium', status: 'trialing', trial_ends_at: future, expires_at: null, reason: 'VIP' },
        now
      ),
      'max'
    )
    // Expired trial override falls back to Free
    assert.equal(
      resolveEffectiveTier(
        null,
        { user_id: 'u1', plan: 'max', status: 'trialing', trial_ends_at: past, expires_at: null, reason: 'VIP' },
        now
      ),
      'free'
    )
    // Cancelled override revokes underlying active subscription
    assert.equal(
      resolveEffectiveTier(
        { plan_id: 'pro_yearly', status: 'active', current_period_end: future },
        { user_id: 'u1', plan: 'max', status: 'cancelled', trial_ends_at: null, expires_at: null, reason: 'Revoked' },
        now
      ),
      'free'
    )
  })
})
