'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ShieldCheck, FlaskConical } from 'lucide-react'
import { PricingCard } from './PricingCard'
import {
  formatInrCurrency,
  getCustomerFacingPlans,
  type SubscriptionPlan,
  type CustomerFacingPlan,
  type PlanId,
} from '@/lib/subscription-utils'

interface PlanComparisonProps {
  plans: SubscriptionPlan[]
  currentPlanId?: PlanId
  currentStatus?: 'active' | 'expired' | 'free' | 'cancelled'
  processingPlanId?: PlanId | null
  showTestPlan?: boolean
  onSelectPlan: (plan: CustomerFacingPlan) => void
}

const COMPARISON_ROWS = [
  {
    feature: 'Smart Entries (Text to Transaction)',
    free: '60 / month',
    proMonthly: '300 / month',
    proYearly: '9,999 / month',
  },
  {
    feature: 'Voice Entries',
    free: '50 / month',
    proMonthly: '250 / month',
    proYearly: '9,999 / month',
  },
  {
    feature: 'Receipt Scans',
    free: '30 / month',
    proMonthly: '150 / month',
    proYearly: '9,999 / month',
  },
  {
    feature: 'Spending Insights',
    free: '10 / month',
    proMonthly: '50 / month',
    proYearly: '9,999 / month',
  },
  {
    feature: 'Daily AI Usage Cap',
    free: 'Standard daily limit',
    proMonthly: '5x daily limit',
    proYearly: 'No daily cap',
  },
  {
    feature: 'Pass Validity & Renewal',
    free: 'Always active',
    proMonthly: '30 days · Prepaid (no auto-debit)',
    proYearly: '365 days · Prepaid (no auto-debit)',
  },
]

export function PlanComparison({
  plans,
  currentPlanId = 'free',
  currentStatus = 'free',
  processingPlanId = null,
  showTestPlan = false,
  onSelectPlan,
}: PlanComparisonProps) {
  const [mobileSelectedTab, setMobileSelectedTab] = useState<'pro_monthly' | 'pro_yearly' | 'free'>(
    currentPlanId === 'pro_yearly' ? 'pro_yearly' : 'pro_monthly'
  )
  const [showMatrix, setShowMatrix] = useState(false)

  const normalizedPlans = getCustomerFacingPlans(plans, { showTestPlan })
  const primaryPlans = normalizedPlans.filter((p) => p.id !== 'test_1inr')
  const testPlan = normalizedPlans.find((p) => p.id === 'test_1inr')

  const isPlanActive = (planId: PlanId) => {
    if (planId === 'free') {
      return currentPlanId === 'free' || currentStatus !== 'active'
    }
    return currentPlanId === planId && currentStatus === 'active'
  }

  const mobileActivePlan =
    primaryPlans.find((p) => p.id === mobileSelectedTab) || primaryPlans[0]

  return (
    <section id="plans-section" aria-label="Subscription plans" className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">
            Choose Your FinFlow Pass
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            Simple prepaid UPI passes with transparent monthly AI limits and zero recurring auto-debit.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-medium text-[#0F766E] self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Instant UPI Verification</span>
        </div>
      </div>

      {/* Mobile Segmented Plan Selector (< 768px) */}
      <div className="md:hidden">
        <div
          role="tablist"
          aria-label="Select plan tier to preview"
          className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-[#E2E8F0]/70 border border-[#E2E8F0]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileSelectedTab === 'pro_monthly'}
            onClick={() => setMobileSelectedTab('pro_monthly')}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
              mobileSelectedTab === 'pro_monthly'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            <span className="block">Pro</span>
            <span className="block text-[11px] font-bold text-[#0F766E]">₹99</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mobileSelectedTab === 'pro_yearly'}
            onClick={() => setMobileSelectedTab('pro_yearly')}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
              mobileSelectedTab === 'pro_yearly'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            <span className="block">Max</span>
            <span className="block text-[11px] font-bold text-[#B45309]">₹999 · -16%</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mobileSelectedTab === 'free'}
            onClick={() => setMobileSelectedTab('free')}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
              mobileSelectedTab === 'free'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            <span className="block">Starter</span>
            <span className="block text-[11px] font-bold text-[#64748B]">₹0</span>
          </button>
        </div>

        {mobileActivePlan && (
          <div className="mt-3.5">
            <PricingCard
              plan={mobileActivePlan}
              isCurrentPlan={isPlanActive(mobileActivePlan.id)}
              isProcessing={processingPlanId === mobileActivePlan.id}
              disabled={processingPlanId !== null}
              onSelectPlan={onSelectPlan}
            />
          </div>
        )}
      </div>

      {/* Tablet & Desktop 3-Column Grid (>= 768px) */}
      <div className="hidden md:grid md:grid-cols-3 gap-5 items-stretch">
        {primaryPlans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={isPlanActive(plan.id)}
            isProcessing={processingPlanId === plan.id}
            disabled={processingPlanId !== null}
            onSelectPlan={onSelectPlan}
          />
        ))}
      </div>

      {/* Optional Test Pass Banner (only when explicitly enabled via ?testMode=1 or active test_1inr holder) */}
      {showTestPlan && testPlan && (
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#475569] shrink-0">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A]">{testPlan.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#475569]">
                  {formatInrCurrency(testPlan.priceInr)} · {testPlan.intervalLabel}
                </span>
                {isPlanActive('test_1inr') && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#047857]">
                    Active on Account
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {testPlan.tagline} (2x monthly AI limits for 7 days).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectPlan(testPlan)}
            disabled={processingPlanId !== null}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
          >
            {isPlanActive('test_1inr')
              ? 'Extend 7-Day Pass (₹1)'
              : 'Activate 7-Day Pass (₹1)'}
          </button>
        </div>
      )}

      {/* Expandable Plan Quota Comparison Table */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowMatrix((prev) => !prev)}
          aria-expanded={showMatrix}
          className="w-full min-h-[52px] px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F766E]"
        >
          <div>
            <span className="text-sm font-semibold text-[#0F172A]">
              Compare All Plan Quotas & Limits
            </span>
            <span className="block text-xs text-[#64748B]">
              Side-by-side breakdown of monthly Smart Entries, Voice, Receipt Scans, and Insights
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] shrink-0">
            <span>{showMatrix ? 'Hide table' : 'View table'}</span>
            {showMatrix ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {showMatrix && (
          <div className="border-t border-[#E2E8F0] overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                  <th className="py-3 px-4 sm:px-5">Feature / Monthly Limit</th>
                  <th className="py-3 px-4 text-center">Free Starter (₹0)</th>
                  <th className="py-3 px-4 text-center text-[#0F766E]">
                    Pro Monthly (₹99)
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-center text-[#B45309]">
                    Max Yearly (₹999)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs sm:text-sm">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="hover:bg-[#F8FAFC]/60">
                    <td className="py-3 px-4 sm:px-5 font-medium text-[#0F172A]">
                      {row.feature}
                    </td>
                    <td
                      className="py-3 px-4 text-center text-[#475569]"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {row.free}
                    </td>
                    <td
                      className="py-3 px-4 text-center font-semibold text-[#0F766E] bg-[#F0FDFA]/30"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {row.proMonthly}
                    </td>
                    <td
                      className="py-3 px-4 sm:px-5 text-center font-semibold text-[#0F172A]"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {row.proYearly}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
