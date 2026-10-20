'use client'

import React from 'react'
import { Check, Sparkles, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import {
  formatInrCurrency,
  type CustomerFacingPlan,
  type PlanId,
} from '@/lib/subscription-utils'

interface PricingCardProps {
  plan: CustomerFacingPlan
  isCurrentPlan: boolean
  isProcessing: boolean
  disabled?: boolean
  onSelectPlan: (plan: CustomerFacingPlan) => void
}

export function PricingCard({
  plan,
  isCurrentPlan,
  isProcessing,
  disabled = false,
  onSelectPlan,
}: PricingCardProps) {
  const isProMonthly = plan.id === 'pro_monthly'
  const isProYearly = plan.id === 'pro_yearly'
  const isFree = plan.id === 'free'
  const isHighlighted = isProMonthly || isProYearly

  return (
    <article
      aria-label={`${plan.name} plan`}
      className={`relative flex flex-col justify-between rounded-2xl p-5 sm:p-6 transition-all ${
        isProMonthly
          ? 'bg-white border-2 border-[#0F766E] shadow-md'
          : isProYearly
          ? 'bg-gradient-to-b from-[#FFFBEB]/40 via-white to-white border-2 border-[#D97706]/70 shadow-sm'
          : 'bg-white border border-[#E2E8F0] shadow-sm'
      }`}
    >
      {/* Top Badge Row */}
      <div>
        <div className="flex items-center justify-between gap-2 min-h-[28px] mb-3">
          {plan.badge ? (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isProYearly
                  ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                  : 'bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]'
              }`}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              {plan.badge}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]">
              Starter Tier
            </span>
          )}

          {isCurrentPlan && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              Current Plan
            </span>
          )}
        </div>

        {/* Plan Name & Tagline */}
        <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">{plan.name}</h3>
        <p className="text-xs sm:text-sm text-[#475569] mt-1 min-h-[36px]">
          {plan.tagline}
        </p>

        {/* Price Block */}
        <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-baseline gap-1.5">
          <span
            className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatInrCurrency(plan.priceInr)}
          </span>
          <span className="text-xs sm:text-sm font-medium text-[#64748B]">
            {plan.intervalLabel}
          </span>
        </div>

        {!isFree && (
          <p className="text-xs text-[#64748B] mt-1">
            One-time prepaid UPI pass · No automatic renewal
          </p>
        )}
        {isFree && (
          <p className="text-xs text-[#64748B] mt-1">
            No payment required · Monthly starter limits
          </p>
        )}

        {/* Feature List */}
        <ul className="mt-5 space-y-2.5 text-xs sm:text-sm text-[#0F172A]">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isProYearly
                    ? 'bg-[#FFFBEB] text-[#B45309]'
                    : 'bg-[#F0FDFA] text-[#0F766E]'
                }`}
              >
                <Check className="w-3 h-3 stroke-[2.5]" />
              </span>
              <span className="leading-snug text-[#334155]">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-4 border-t border-[#F1F5F9]">
        {isFree ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] text-sm font-semibold cursor-default"
          >
            {isCurrentPlan ? 'Current Plan' : 'Included Free Tier'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectPlan(plan)}
            disabled={disabled || isProcessing}
            className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${
              isProYearly
                ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white focus-visible:ring-[#0F172A] shadow-sm'
                : isHighlighted
                ? 'bg-[#0F766E] hover:bg-[#115E59] text-white focus-visible:ring-[#0F766E] shadow-sm'
                : 'bg-[#0F766E] hover:bg-[#115E59] text-white focus-visible:ring-[#0F766E]'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Opening UPI Checkout...</span>
              </>
            ) : isCurrentPlan ? (
              <>
                <span>Extend {plan.name} Pass</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            ) : (
              <>
                <span>
                  Choose {plan.name} · {formatInrCurrency(plan.priceInr)}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        )}

        {!isFree && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
            <span>Instant activation via GPay, PhonePe, Paytm or BHIM</span>
          </div>
        )}
      </div>
    </article>
  )
}

export type { PlanId }
