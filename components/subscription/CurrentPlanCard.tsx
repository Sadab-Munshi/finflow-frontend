'use client'

import React from 'react'
import {
  Sparkles,
  Calendar,
  ArrowUpRight,
  ReceiptText,
  Clock,
  ShieldCheck,
  Crown,
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
  const isMaxPlan = subscription?.planId === 'pro_yearly'
  const planName = getPlanDisplayName(subscription?.planId, subscription?.planName)
  const daysRemaining = isPaidActive
    ? getDaysRemaining(subscription?.currentPeriodEnd)
    : null
  const isExpiringSoon =
    daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 5

  const multiplier = Math.max(
    1,
    Number(subscription?.aiMultiplier) ||
      (subscription?.planId === 'pro_monthly' || subscription?.planId === 'trial_7d'
        ? 5
        : 1)
  )

  const quotaHeadline = subscription?.unlimitedAi
    ? 'High-Capacity 9,999/mo'
    : multiplier > 1
    ? `${multiplier}× AI Allowance`
    : 'Standard AI Allowance'

  const showReceiptBtn = Boolean(latestPaidOrder && onViewLatestReceipt)

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
          <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#042F2E] via-[#0F172A] to-[#115E59] text-white border border-amber-400/30 shadow-lg">
            {/* Subtle ambient glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-amber-400/15 blur-3xl"
            />

            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5">
                {/* Left: Compact Pro/Max Header + Validity */}
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400/25 to-teal-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 fill-amber-300/30" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
                            {isExpiringSoon
                              ? 'Expiring Soon'
                              : isMaxPlan
                              ? 'Active Max'
                              : 'Active Pro'}
                          </span>
                          <span className="text-xs font-semibold text-teal-200">
                            · {quotaHeadline}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate mt-0.5">
                          {planName}
                        </h2>
                      </div>
                    </div>

                    {daysRemaining !== null && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-bold text-[11px] whitespace-nowrap shrink-0">
                        {daysRemaining === 0
                          ? 'Expires today'
                          : daysRemaining === 1
                          ? '1 day left'
                          : `${daysRemaining} days left`}
                      </span>
                    )}
                  </div>

                  {/* Single clean validity bar */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-200 bg-white/8 border border-white/10 rounded-xl px-3 py-2">
                    {subscription?.currentPeriodEnd && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                        <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        Valid until {formatLocalizedDate(subscription.currentPeriodEnd)}
                      </span>
                    )}
                    <span className="text-slate-300/80">
                      · Prepaid pass (no auto-debit)
                    </span>
                  </div>
                </div>

                {/* Right: Action CTA (+ Receipt if available, without duplicate History link) */}
                <div
                  className={`${
                    showReceiptBtn ? 'grid grid-cols-2' : 'flex'
                  } sm:flex sm:flex-row items-center gap-2.5 shrink-0`}
                >
                  <button
                    type="button"
                    onClick={onUpgradeClick}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs sm:text-sm font-extrabold shadow-sm transition-all active:scale-[0.99] whitespace-nowrap"
                  >
                    <span>Extend Pass</span>
                    <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  </button>

                  {latestPaidOrder && onViewLatestReceipt && (
                    <button
                      type="button"
                      onClick={() => onViewLatestReceipt(latestPaidOrder)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3.5 sm:px-4 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
                    >
                      <ReceiptText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
                      <span>Receipt</span>
                    </button>
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
        strength={0.6}
        theme="light"
        borderRadius={20}
      >
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-white via-[#F0FDFA] to-[#CCFBF1]/35 border border-[#99F6E4] shadow-sm">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Pass Ended · Free Starter
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0F766E] text-white">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      Free Plan
                    </span>
                  )}
                  <span className="text-xs font-semibold text-[#0F766E]">
                    · {quotaHeadline}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                  {planName}
                </h2>

                <p className="text-xs sm:text-sm text-[#334155] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <span>Starter monthly AI quota active · Upgrade anytime with Pro or Max</span>
                </p>
              </div>

              <div
                className={`${
                  showReceiptBtn ? 'grid grid-cols-2' : 'flex'
                } sm:flex sm:flex-row items-center gap-2.5 shrink-0`}
              >
                <button
                  type="button"
                  onClick={onUpgradeClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#059669] hover:from-[#115E59] hover:to-[#047857] text-white text-xs sm:text-sm font-bold shadow-xs transition-all whitespace-nowrap"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
                  <span>Upgrade Plan</span>
                </button>

                {latestPaidOrder && onViewLatestReceipt && (
                  <button
                    type="button"
                    onClick={() => onViewLatestReceipt(latestPaidOrder)}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    <ReceiptText className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                    <span>Receipt</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </BorderBeam>
    </section>
  )
}
