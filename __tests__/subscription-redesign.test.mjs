import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

// Load and transpile lib/subscription-utils.ts in memory for direct execution in Node
function loadSubscriptionUtils() {
  const filePath = path.resolve(process.cwd(), 'lib/subscription-utils.ts')
  const source = fs.readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const moduleObj = { exports: {} }
  const fn = new Function('exports', 'module', 'require', transpiled.outputText)
  fn(moduleObj.exports, moduleObj, () => ({}))
  return moduleObj.exports
}

const utils = loadSubscriptionUtils()

test('formatInrCurrency formats Indian Rupees cleanly with and without decimals', () => {
  assert.equal(utils.formatInrCurrency(0), '₹0')
  assert.equal(utils.formatInrCurrency(99), '₹99')
  assert.equal(utils.formatInrCurrency(999), '₹999')
  assert.equal(utils.formatInrCurrency(99, { showDecimals: true }), '₹99.00')
  assert.equal(utils.formatInrCurrency(null), '₹0')
  assert.equal(utils.formatInrCurrency(undefined), '₹0')
  assert.equal(utils.formatInrCurrency('invalid'), '₹0')
})

test('normalizePaymentStatus maps all raw statuses to canonical customer-friendly states and never spoofs Paid', () => {
  const paid = utils.normalizePaymentStatus('SUCCESS')
  assert.equal(paid.status, 'paid')
  assert.equal(paid.label, 'Paid')
  assert.equal(paid.isPaid, true)

  const initiated = utils.normalizePaymentStatus('INITIATED')
  assert.equal(initiated.status, 'pending')
  assert.equal(initiated.label, 'Pending')
  assert.equal(initiated.isPaid, false)
  assert.equal(initiated.canVerify, true)

  const pending = utils.normalizePaymentStatus('PENDING')
  assert.equal(pending.status, 'pending')
  assert.equal(pending.isPaid, false)

  const failed = utils.normalizePaymentStatus('FAILED')
  assert.equal(failed.status, 'failed')
  assert.equal(failed.label, 'Failed')
  assert.equal(failed.isPaid, false)

  const suspicious = utils.normalizePaymentStatus('SUSPICIOUS')
  assert.equal(suspicious.status, 'failed')
  assert.equal(suspicious.isPaid, false)

  const expired = utils.normalizePaymentStatus('EXPIRED')
  assert.equal(expired.status, 'expired')
  assert.equal(expired.label, 'Expired')
  assert.equal(expired.isPaid, false)

  const refunded = utils.normalizePaymentStatus('REFUNDED')
  assert.equal(refunded.status, 'refunded')
  assert.equal(refunded.label, 'Refunded')
  assert.equal(refunded.isPaid, false)
})

test('formatQuotaMetric and getNormalizedUsageMetrics map internal keys to friendly labels and semantic tones', () => {
  const metrics = utils.getNormalizedUsageMetrics(
    {
      nlp: { used: 15, limit: 60 },
      receipt: { used: 24, limit: 30 },
      voice: { used: 48, limit: 50 },
      insights: { used: 2, limit: 10 },
    },
    false
  )

  assert.equal(metrics.length, 4)
  assert.deepEqual(
    metrics.map((m) => m.label),
    ['Smart Entries', 'Receipt Scans', 'Voice Entries', 'Spending Insights']
  )

  // 15/60 = 25% -> normal
  assert.equal(metrics[0].tone, 'normal')
  assert.equal(metrics[0].remaining, 45)

  // 24/30 = 80% -> warning
  assert.equal(metrics[1].tone, 'warning')
  assert.equal(metrics[1].remaining, 6)

  // 48/50 = 96% -> danger
  assert.equal(metrics[2].tone, 'danger')
  assert.equal(metrics[2].remaining, 2)

  // Pro Monthly (5x multiplier): must scale limits to 300, 150, 250, 50 even if rawStat has base limits or is null
  const proMonthlyMetrics = utils.getNormalizedUsageMetrics(
    {
      nlp: { used: 0, limit: 60 },
      receipt: { used: 0, limit: 30 },
      voice: { used: 0, limit: 50 },
      insights: { used: 0, limit: 10 },
    },
    false,
    5
  )
  assert.deepEqual(
    proMonthlyMetrics.map((m) => m.limit),
    [300, 150, 250, 50]
  )
  assert.deepEqual(
    proMonthlyMetrics.map((m) => m.usageText),
    ['0 / 300', '0 / 150', '0 / 250', '0 / 50']
  )

  // High-capacity Pro Yearly (unlimitedAi: true -> 9,999/month)
  const yearlyMetrics = utils.getNormalizedUsageMetrics(
    { nlp: { used: 120, limit: 9999 } },
    true,
    999
  )
  assert.equal(yearlyMetrics[0].limit, 9999)
  assert.equal(yearlyMetrics[0].isHighCapacity, true)
})

test('getCustomerFacingPlans always lists the paid trial_7d pass as a normal plan', () => {
  const plans = utils.getCustomerFacingPlans([])
  assert.deepEqual(
    plans.map((p) => p.id),
    ['free', 'trial_7d', 'pro_monthly', 'pro_yearly']
  )

  // The retired ₹1 pass is gone; the paid 7-day pass replaces it at full Pro value.
  const trial = plans.find((p) => p.id === 'trial_7d')
  assert.equal(trial.priceInr, 19)
  assert.equal(trial.durationDays, 7)
  assert.equal(utils.getPlanDisplayName('trial_7d'), '7-Day Trial Pass')
  assert.ok(!plans.some((p) => p.id === 'test_1inr'))
})

test('customer-facing subscription UI files contain zero internal gateway or engineering jargon', () => {
  const filesToAudit = [
    'lib/subscription-utils.ts',
    'app/subscription/page.tsx',
    'app/subscription/payments/page.tsx',
    'components/subscription/SubscriptionPageHeader.tsx',
    'components/subscription/CurrentPlanCard.tsx',
    'components/subscription/UsageOverview.tsx',
    'components/subscription/PricingCard.tsx',
    'components/subscription/PlanComparison.tsx',
    'components/subscription/PaymentStatusBadge.tsx',
    'components/subscription/PaymentHistoryList.tsx',
    'components/subscription/PaymentHistoryTable.tsx',
    'components/subscription/PaymentDetails.tsx',
    'components/subscription/PurchaseReview.tsx',
    'components/subscription/AsyncState.tsx',
  ]

  const forbiddenTerms = [
    'YOUPI PG',
    'HMAC-SHA256',
    'Gmail Observer',
    'Receipt OCR',
    'AI NLP',
  ]

  for (const relPath of filesToAudit) {
    const content = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
    for (const term of forbiddenTerms) {
      assert.equal(
        content.includes(term),
        false,
        `Expected ${relPath} not to contain forbidden jargon "${term}"`
      )
    }
  }
})

test('redesigned landing page uses unique ReactBits & BorderBeam code-loop visualisations per feature and natural copy', () => {
  const homeContent = fs.readFileSync(
    path.resolve(process.cwd(), 'app/(landing)/HomeContent.tsx'),
    'utf8'
  )

  const motionLoops = fs.readFileSync(
    path.resolve(process.cwd(), 'components/landing/MotionLoops.tsx'),
    'utf8'
  )

  // Verify each unique visual loop component is wired into HomeContent
  assert.ok(homeContent.includes('HeroCardSwapLoop'))
  assert.ok(homeContent.includes('VoicePillVisual'))
  assert.ok(homeContent.includes('TearTicketReceiptVisual'))
  assert.ok(homeContent.includes('InsightPulseVisual'))
  assert.ok(homeContent.includes('MonthlyReportVisual'))
  assert.ok(homeContent.includes('BudgetGaugeVisual'))
  assert.ok(homeContent.includes('SecurityVaultVisual'))
  assert.ok(motionLoops.includes('BorderBeam'))

  // Verify banned robotic phrases and old sections are absent
  assert.equal(homeContent.includes('Automated Finance'), false)
  assert.equal(homeContent.includes('Everything happens automatically'), false)
  assert.equal(homeContent.includes('00 / LIVE AI PARSER SANDBOX'), false)
  assert.equal(homeContent.includes('LiveExpenseDemo'), false)
  assert.equal(homeContent.includes('PhoneSlider'), false)

  // Ensure no pricing tiers or subscription pricing clutter is shown on the landing page
  const forbiddenLandingPricing = ['Pro Monthly', 'Pro Yearly', '₹99/month', '₹999/year', '/subscription']
  for (const term of forbiddenLandingPricing) {
    assert.equal(
      homeContent.includes(term),
      false,
      `Expected HomeContent.tsx not to include pricing term "${term}"`
    )
  }
})

