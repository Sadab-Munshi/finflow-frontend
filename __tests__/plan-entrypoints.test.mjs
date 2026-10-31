import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Subscription entry points.
 *
 * Two surfaces are behind the admin switch: the "Pro Plans" row in the
 * desktop sidebar and the mobile drawer, and the Profile upgrade CTA. The
 * routes themselves stay mounted so a direct URL keeps working — that is what
 * keeps the UPI return-and-verify flow alive.
 */

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))

const NAV = 'components/layout/sidebar/sidebar-nav.ts'
const RAIL = 'components/layout/sidebar/PremiumSidebar.tsx'
const DRAWER = 'components/layout/sidebar/MobileNavDrawer.tsx'
const PROFILE = 'app/profile/page.tsx'
const CONTEXT = 'context/SubscriptionGateContext.tsx'
const API_CLIENT = 'lib/api-client.ts'
const GATE = 'lib/subscription-gate.ts'
const MIGRATION = 'supabase/migrations/017_plan_entrypoints.sql'

test('Plan entry points — data flow', async (t) => {
  await t.test('the flag ships as a column with a visible default', () => {
    assert.ok(exists(MIGRATION), 'migration 017 is present')
    const sql = read(MIGRATION)
    assert.match(sql, /subscription_ui_enabled\s+boolean\s+NOT NULL\s+DEFAULT\s+true/i)
  })

  await t.test('the bootstrap payload carries the switch', () => {
    assert.match(read(API_CLIENT), /subscriptionUiEnabled: boolean/)
    assert.match(read(GATE), /subscription_ui_enabled: boolean/)
    assert.match(read(GATE), /subscription_ui_enabled: true/)
  })

  await t.test('the context fails open — only an explicit false hides anything', () => {
    const ctx = read(CONTEXT)
    assert.match(ctx, /subscription_ui_enabled: s\.subscriptionUiEnabled !== false/)
    assert.match(ctx, /subscriptionUiEnabled: settings\.subscription_ui_enabled/)
    assert.match(ctx, /subscriptionUiEnabled: boolean/)
  })
})

test('Plan entry points — the nav row', async (t) => {
  await t.test('the filter exists and names the plan-only path', () => {
    const nav = read(NAV)
    assert.match(nav, /export const PLAN_ONLY_PATHS/)
    assert.match(nav, /'\/subscription'/)
    assert.match(nav, /export function navItemsForSubscriptionUi/)
  })

  await t.test('desktop sidebar uses the filter', () => {
    const rail = read(RAIL)
    assert.match(rail, /navItemsForSubscriptionUi\(SIDEBAR_PRIMARY_NAV, subscriptionUiEnabled\)/)
    assert.match(rail, /<SidebarNavList items=\{primaryNav\}/)
    assert.ok(
      !rail.includes('items={SIDEBAR_PRIMARY_NAV}'),
      'the raw list is no longer rendered directly'
    )
  })

  await t.test('mobile drawer uses the filter', () => {
    const drawer = read(DRAWER)
    assert.match(drawer, /navItemsForSubscriptionUi\(SIDEBAR_PRIMARY_NAV, subscriptionUiEnabled\)/)
    assert.match(drawer, /useSubscriptionGate\(\)/)
    assert.ok(
      !drawer.includes('items={SIDEBAR_PRIMARY_NAV}'),
      'the raw list is no longer rendered directly'
    )
  })
})

test('Plan entry points — profile', async (t) => {
  await t.test('the AI-usage card carries no subscription CTA at all', () => {
    const profile = read(PROFILE)
    assert.ok(
      !profile.includes('Manage Subscription'),
      'the Manage Subscription label is gone from the profile page'
    )
    assert.ok(
      !profile.includes('href="/subscription"'),
      'no link from the profile page into the subscription page'
    )
  })

  await t.test('the rest of the usage card survives', () => {
    const profile = read(PROFILE)
    assert.match(profile, /t\('aiUsageTitle'\)/)
    assert.match(profile, /t\('aiUsed'/)
    assert.match(profile, /t\('aiReset'\)/)
  })

  await t.test('plan identity the user paid for is untouched', () => {
    // The header crown and the PRO chip are entitlement feedback, not
    // advertising, so they stay exactly as they were.
    const profile = read(PROFILE)
    assert.match(profile, /isProMember && \(/)
    assert.match(profile, /Pro Allowance/)
  })
})

test('Plan entry points — routes stay reachable', () => {
  assert.ok(exists('app/subscription/page.tsx'))
  assert.ok(exists('app/subscription/payments/page.tsx'))
  for (const page of ['app/subscription/page.tsx', 'app/subscription/payments/page.tsx']) {
    const src = read(page)
    assert.ok(
      !src.includes('subscriptionUiEnabled'),
      `${page} must not be gated by the switch — a direct URL keeps working`
    )
  }
})
