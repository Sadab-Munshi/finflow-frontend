'use client'

import React from 'react'
import { Check, Sparkles, Loader2, ArrowRight, ShieldCheck, Crown } from 'lucide-react'
import { BorderBeam } from 'border-beam'
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

  const cardInner = (
    <article
      aria-label={`${plan.name} plan`}
      className={`relative h-full flex flex-col justify-between rounded-[20px] p-5 sm:p-6 transition-all ${
        isProMonthly
          ? 'bg-gradient-to-b from-[#F0FDFA] via-white to-white border border-[#14B8A6]/60 shadow-lg shadow-teal-900/5'
          : isProYearly
          ? 'bg-gradient-to-b from-[#FFFBEB] via-white to-white border border-amber-400/70 shadow-lg shadow-amber-900/5'
          : 'bg-white border border-[#E2E8F0] shadow-sm'
      }`}
    >
      {/* Top Badge Row */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 min-h-[28px] mb-3">
          {/* When this card is the active plan, the Current Plan chip is the only badge
              that should show — the marketing badge used to collide with it on narrow cards. */}
          {isCurrentPlan ? null : plan.badge ? (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs ${
                isProYearly
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-gradient-to-r from-[#0F766E] to-[#059669] text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {plan.badge}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]">
              Starter Tier
            </span>
          )}

          {isCurrentPlan && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-100 to-emerald-100 text-[#065F46] border border-emerald-300 shadow-2xs">
              <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
              <span>Current Plan</span>
            </span>
          )}
        </div>

        {/* Plan Name & Tagline */}
        <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] flex items-center gap-1.5">
          <span>{plan.name}</span>
          {!isFree && (
            <Crown
              className={`w-4 h-4 shrink-0 ${
                isProYearly
                  ? 'text-amber-500 fill-amber-400'
                  : 'text-teal-600 fill-teal-500/20'
              }`}
            />
          )}
        </h3>
        <p className="text-xs sm:text-sm text-[#475569] mt-1 min-h-[36px] leading-relaxed">
          {plan.tagline}
        </p>

        {/* Price Block */}
        <div className="mt-4 pt-4 border-t border-[#E2E8F0]/80 flex items-baseline gap-1.5">
          <span
            className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatInrCurrency(plan.priceInr)}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-[#64748B]">
            {plan.intervalLabel}
          </span>
        </div>

        {!isFree ? (
          <p className="text-xs font-medium text-[#0F766E] mt-1">
            One-time prepaid UPI pass · No automatic renewal
          </p>
        ) : (
          <p className="text-xs text-[#64748B] mt-1">
            No payment required · Monthly starter limits
          </p>
        )}

        {/* Feature List */}
        <ul className="mt-5 space-y-2.5 text-xs sm:text-sm text-[#0F172A]">
          {plan.features.map((feature: string, index: number) => (
            <li key={index} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isProYearly
                    ? 'bg-amber-100 text-[#B45309]'
                    : 'bg-teal-100 text-[#0F766E]'
                }`}
              >
                <Check className="w-3 h-3 stroke-[2.75]" />
              </span>
              <span className="leading-snug font-medium text-[#1E293B]">
                {feature}
              </span>
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
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] text-sm font-semibold cursor-default"
          >
            {isCurrentPlan ? 'Current Plan' : 'Included Free Tier'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectPlan(plan)}
            disabled={disabled || isProcessing}
            className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${
              isProYearly
                ? 'bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#334155] hover:from-[#1E293B] hover:to-[#0F172A] text-amber-300 shadow-md shadow-slate-900/15 focus-visible:ring-[#0F172A]'
                : isHighlighted
                ? 'bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#059669] hover:from-[#115E59] hover:to-[#047857] text-white shadow-md shadow-teal-600/20 focus-visible:ring-[#0F766E]'
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
                <Crown className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
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
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#64748B]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
            <span>Instant activation via GPay, PhonePe, Paytm or BHIM</span>
          </div>
        )}
      </div>
    </article>
  )

  if (isProMonthly || isProYearly || isCurrentPlan) {
    return (
      <BorderBeam
        size="md"
        colorVariant={isProYearly ? 'sunset' : 'colorful'}
        strength={isCurrentPlan ? 0.85 : 0.7}
        theme="light"
        borderRadius={20}
        className="h-full"
      >
        {cardInner}
      </BorderBeam>
    )
  }

  return cardInner
}

export type { PlanId }
