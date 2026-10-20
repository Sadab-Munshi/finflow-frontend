'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, ReceiptText } from 'lucide-react'

interface SubscriptionPageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  showHistoryLink?: boolean
  isPro?: boolean
  planBadgeText?: string
  onRefresh?: () => void
  refreshing?: boolean
}

export function SubscriptionPageHeader({
  title,
  subtitle,
  backHref = '/dashboard',
  backLabel = 'Back',
  showHistoryLink = false,
  onRefresh,
  refreshing = false,
}: SubscriptionPageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-2xs no-print">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16 gap-2">
          {/* Left: Back button + Single-line Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              aria-label={backLabel}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] active:scale-[0.98] transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-[15px] sm:text-xl font-bold text-[#0F172A] tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden md:block text-xs text-[#64748B] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Compact Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {showHistoryLink && (
              <Link
                href="/subscription/payments"
                className="inline-flex items-center justify-center gap-1.5 h-10 px-3 sm:px-3.5 rounded-xl border border-[#E2E8F0] bg-white text-xs sm:text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
              >
                <ReceiptText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0F766E] shrink-0" />
                <span className="hidden sm:inline">Payment History</span>
                <span className="sm:hidden">History</span>
              </Link>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh subscription status"
                className="inline-flex items-center justify-center gap-1.5 h-10 w-10 sm:w-auto sm:px-3 rounded-xl border border-[#E2E8F0] bg-white text-xs sm:text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
              >
                <RefreshCw
                  className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin text-[#0F766E]' : ''}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
