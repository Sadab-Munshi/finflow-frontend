'use client'

import React from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  ReceiptText,
  Clock,
  ShieldCheck,
  Crown,
  Zap,
} from 'lucide-react'
import { BorderBeam } from 'border-beam'
import {
  formatLocalizedDate,
  getDaysRemaining,
  getPlanDisplayName,
  type UserSubscriptionState,
  type PaymentOrderRecord,
} from '@/lib/subscription-utils'

interface CurrentPlanCardProps {
  subscription: UserSubscriptionState | null
  latestPaidOrder?: PaymentOrderRecord | null
  onUpgradeClick: () => void
  onViewLatestReceipt?: (order: PaymentOrderRecord) => void
}

export function CurrentPlanCard({
  subscription,
  latestPaidOrder,
  onUpgradeClick,
  onViewLatestReceipt,
}: CurrentPlanCardProps) {
  const isPaidActive =
    subscription?.status === 'active' && subscription.planId !== 'free'
  const isExpired = subscription?.status === 'expired'
  const planName = getPlanDisplayName(subscription?.planId, subscription?.planName)
  const daysRemaining = isPaidActive
    ? getDaysRemaining(subscription?.currentPeriodEnd)
    : null
  const isExpiringSoon =
    daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 5

  const multiplier = Math.max(1, Number(subscription?.aiMultiplier) || (subscription?.planId === 'pro_monthly' ? 5 : subscription?.planId === 'test_1inr' ? 2 : 1))

  const quotaHeadline = subscription?.unlimitedAi
    ? 'High-Capacity Quota (9,999/mo)'
    : multiplier > 1
    ? `${multiplier}× Monthly AI Boost Active`
    : 'Standard Monthly AI Allowance'

  const tierQuotaSummary = subscription?.unlimitedAi
    ? '9,999 Smart · 9,999 Scans · 9,999 Voice · 9,999 Insights / mo'
    : `${60 * multiplier} Smart · ${30 * multiplier} Scans · ${50 * multiplier} Voice · ${10 * multiplier} Insights / mo`

  if (isPaidActive) {
    return (
      <section aria-label="Current subscription status">
        <BorderBeam
          size="md"
          colorVariant="colorful"
          strength={0.85}
          theme="dark"
          borderRadius={20}
        >
          <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#042F2E] via-[#0F172A] to-[#134E4A] text-white border border-amber-400/30 shadow-xl">
            {/* Ambient radial highlights */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-400/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-400/15 blur-3xl"
            />

            <div className="relative z-10 p-5 sm:p-7">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left: Pro Identity & Validity */}
                <div className="space-y-3.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-md">
                      <Crown className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                      <span>{isExpiringSoon ? 'Pro Expiring Soon' : 'Active Pro Pass'}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30 backdrop-blur-xs">
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
                      <span>{quotaHeadline}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400/25 via-teal-400/20 to-amber-500/25 border border-amber-300/40 flex items-center justify-center shadow-inner shrink-0">
                      <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 fill-amber-300/30" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300/90">
                        FinFlow Pro Membership
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                        {planName}
                      </h2>
                    </div>
                  </div>

                  {/* Unlocked Allowance Pill */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs sm:text-sm font-medium text-teal-100">
                    <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Unlocked Allowance: <strong className="text-white font-semibold">{tierQuotaSummary}</strong></span>
                  </div>

                  {/* Validity & renewal explanation */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-200 pt-0.5">
                    {subscription?.currentPeriodEnd && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                        <Calendar className="w-4 h-4 text-amber-300 shrink-0" />
                        Valid until {formatLocalizedDate(subscription.currentPeriodEnd)}
                      </span>
                    )}
                    {daysRemaining !== null && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        {daysRemaining === 0
                          ? 'Expires today'
                          : daysRemaining === 1
                          ? '1 day remaining'
                          : `${daysRemaining} days remaining`}
                      </span>
                    )}
                    <span className="text-slate-300/80 text-xs">
                      · Prepaid pass (no automatic renewal)
                    </span>
                  </div>
                </div>

                {/* Right: Primary & Secondary Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={onUpgradeClick}
                    className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-sm font-extrabold shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    <span>Extend or Switch Pass</span>
                    <ArrowUpRight className="w-4 h-4 shrink-0" />
                  </button>

                  {latestPaidOrder && onViewLatestReceipt ? (
                    <button
                      type="button"
                      onClick={() => onViewLatestReceipt(latestPaidOrder)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[46px] px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold backdrop-blur-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                    >
                      <ReceiptText className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Latest Receipt</span>
                    </button>
                  ) : (
                    <Link
                      href="/subscription/payments"
                      className="inline-flex items-center justify-center gap-1.5 min-h-[46px] px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold backdrop-blur-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                    >
                      <ReceiptText className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Payment History</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </BorderBeam>
      </section>
    )
  }

  return (
    <section aria-label="Current subscription status">
      <BorderBeam
        size="md"
        colorVariant="ocean"
        strength={0.65}
        theme="light"
        borderRadius={20}
      >
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-white via-[#F0FDFA] to-[#CCFBF1]/40 border border-[#99F6E4] shadow-md">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              {/* Plan identity & validity */}
              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Pass Ended · Free Starter Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0F766E] text-white shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      Free Plan
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-[#0F766E] border border-[#99F6E4]">
                    {quotaHeadline}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                    Current Plan
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight mt-0.5">
                    {planName}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-[#334155]">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
                    Includes monthly starter AI quota ({tierQuotaSummary}) · Upgrade anytime for 5× or unlimited-feel AI power
                  </span>
                </div>
              </div>

              {/* Primary & Secondary Actions */}
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onUpgradeClick}
                  className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#059669] hover:from-[#115E59] hover:to-[#047857] text-white text-sm font-bold shadow-md shadow-teal-600/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
                >
                  <Crown className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
                  <span>Upgrade to Pro</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0" />
                </button>

                {latestPaidOrder && onViewLatestReceipt ? (
                  <button
                    type="button"
                    onClick={() => onViewLatestReceipt(latestPaidOrder)}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[46px] px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold transition-colors"
                  >
                    <ReceiptText className="w-4 h-4 text-[#0F766E] shrink-0" />
                    <span>Latest Receipt</span>
                  </button>
                ) : (
                  <Link
                    href="/subscription/payments"
                    className="inline-flex items-center justify-center gap-1.5 min-h-[46px] px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold transition-colors"
                  >
                    <ReceiptText className="w-4 h-4 text-[#0F766E] shrink-0" />
                    <span>Payment History</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </BorderBeam>
    </section>
  )
}
