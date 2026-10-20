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
} from 'lucide-react'
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

  const quotaHeadline = subscription?.unlimitedAi
    ? 'High-Capacity Quota (9,999/mo)'
    : subscription?.aiMultiplier && subscription.aiMultiplier > 1
    ? `${subscription.aiMultiplier}x Monthly AI Allowance`
    : 'Standard Monthly AI Allowance'

  return (
    <section
      aria-label="Current subscription status"
      className="relative overflow-hidden rounded-2xl bg-white border border-[#E2E8F0] shadow-sm"
    >
      {/* Top accent bar */}
      <div
        className={`h-1.5 w-full ${
          isPaidActive
            ? 'bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#D97706]'
            : 'bg-gradient-to-r from-[#0F766E] to-[#14B8A6]'
        }`}
      />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Plan identity & validity */}
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isPaidActive ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    isExpiringSoon
                      ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                      : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {isExpiringSoon ? 'Expiring Soon' : 'Active Pass'}
                </span>
              ) : isExpired ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Pass Ended · Free Starter Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Free Plan
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]">
                {quotaHeadline}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                Current Plan
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-0.5">
                {planName}
              </h2>
            </div>

            {/* Validity & renewal explanation */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-[#475569]">
              {isPaidActive && subscription?.currentPeriodEnd ? (
                <>
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#0F172A]">
                    <Calendar className="w-4 h-4 text-[#0F766E] shrink-0" />
                    Valid until {formatLocalizedDate(subscription.currentPeriodEnd)}
                  </span>
                  {daysRemaining !== null && (
                    <span className="inline-flex items-center gap-1 text-[#0F766E] font-semibold">
                      ·{' '}
                      {daysRemaining === 0
                        ? 'Expires today'
                        : daysRemaining === 1
                        ? '1 day remaining'
                        : `${daysRemaining} days remaining`}
                    </span>
                  )}
                  <span className="text-[#64748B]">
                    · Prepaid pass (no automatic renewal)
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[#475569]">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
                  Includes monthly starter AI quota · Upgrade anytime with a one-time UPI pass
                </span>
              )}
            </div>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onUpgradeClick}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
            >
              <span>{isPaidActive ? 'Extend or Switch Pass' : 'Upgrade to Pro'}</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </button>

            {latestPaidOrder && onViewLatestReceipt ? (
              <button
                type="button"
                onClick={() => onViewLatestReceipt(latestPaidOrder)}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
              >
                <ReceiptText className="w-4 h-4 text-[#0F766E] shrink-0" />
                <span>Latest Receipt</span>
              </button>
            ) : (
              <Link
                href="/subscription/payments"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
              >
                <ReceiptText className="w-4 h-4 text-[#0F766E] shrink-0" />
                <span>Payment History</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
