'use client'

import React, { useEffect } from 'react'
import {
  X,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import {
  formatInrCurrency,
  formatLocalizedDate,
  type SubscriptionPlan,
  type CustomerFacingPlan,
  type UserSubscriptionState,
} from '@/lib/subscription-utils'

interface PurchaseReviewProps {
  plan: (CustomerFacingPlan | SubscriptionPlan) | null
  currentSubscription?: UserSubscriptionState | null
  isProcessing?: boolean
  onConfirm: (plan: CustomerFacingPlan | SubscriptionPlan) => void
  onCancel: () => void
}

export function PurchaseReview({
  plan,
  currentSubscription,
  isProcessing = false,
  onConfirm,
  onCancel,
}: PurchaseReviewProps) {
  useEffect(() => {
    if (!plan) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [plan, isProcessing, onCancel])

  if (!plan) return null

  // Compute expected validity end date matching backend logic
  const now = new Date()
  let baseStart = now
  if (
    currentSubscription?.status === 'active' &&
    currentSubscription.planId === plan.id &&
    currentSubscription.currentPeriodEnd &&
    new Date(currentSubscription.currentPeriodEnd).getTime() > now.getTime()
  ) {
    baseStart = new Date(currentSubscription.currentPeriodEnd)
  }
  const expectedEnd = new Date(
    baseStart.getTime() + plan.durationDays * 24 * 60 * 60 * 1000
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={() => !isProcessing && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-review-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0F766E] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="purchase-review-title"
                className="text-base font-bold text-[#0F172A]"
              >
                Confirm Your Pass
              </h2>
              <p className="text-xs text-[#64748B]">
                One-time prepaid UPI checkout
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="Cancel purchase review"
            className="w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] flex items-center justify-center text-[#475569] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Selected Plan Card */}
          <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
                Selected Pass
              </p>
              <p className="text-lg font-bold text-[#0F172A] mt-0.5">
                {plan.name}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                {plan.durationDays} days full access
              </p>
            </div>

            <div className="text-right">
              <p
                className="text-2xl font-extrabold text-[#0F172A]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatInrCurrency(plan.priceInr)}
              </p>
              <p className="text-[11px] text-[#64748B]">Inclusive of taxes</p>
            </div>
          </div>

          {/* Summary Rows */}
          <dl className="divide-y divide-[#E2E8F0] text-xs sm:text-sm">
            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-[#64748B] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0F766E]" />
                <span>Access valid until</span>
              </dt>
              <dd className="font-semibold text-[#0F172A]">
                {formatLocalizedDate(expectedEnd.toISOString())}
              </dd>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-[#64748B]">Billing type</dt>
              <dd className="font-medium text-[#0F172A]">
                One-time prepaid (no auto-debit)
              </dd>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-[#64748B]">Payment method</dt>
              <dd className="font-medium text-[#0F172A]">
                UPI QR or UPI App (GPay, PhonePe, Paytm)
              </dd>
            </div>
          </dl>

          {/* Key highlights */}
          <div className="rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] p-3.5 space-y-1.5">
            <p className="text-xs font-semibold text-[#0F766E] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>What happens next</span>
            </p>
            <p className="text-xs text-[#334155] leading-relaxed">
              Scan the UPI QR code or tap your UPI app in the next step. As soon as your payment is confirmed, your {plan.name} allowance unlocks automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-sm font-semibold text-[#475569] transition-colors disabled:opacity-50 order-2 sm:order-1"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onConfirm(plan)}
            disabled={isProcessing}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60 order-1 sm:order-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Starting UPI Checkout...</span>
              </>
            ) : (
              <>
                <span>Pay {formatInrCurrency(plan.priceInr)} via UPI</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        </div>

        <div className="px-5 pb-3 bg-[#F8FAFC] flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
          <span>Encrypted payment session · Instant digital receipt</span>
        </div>
      </div>
    </div>
  )
}
