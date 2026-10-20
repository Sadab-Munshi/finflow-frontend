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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[56px] md:min-h-[68px] py-2 gap-3">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              aria-label={backLabel}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] active:scale-[0.98] transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden sm:block text-xs md:text-sm text-[#475569] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {showHistoryLink && (
              <Link
                href="/subscription/payments"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs sm:text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
              >
                <ReceiptText className="w-4 h-4 text-[#0F766E] shrink-0" />
                <span className="hidden xs:inline sm:inline">Payment History</span>
                <span className="xs:hidden sm:hidden">History</span>
              </Link>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh subscription status"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs sm:text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
              >
                <RefreshCw
                  className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin text-[#0F766E]' : ''}`}
                />
                <span className="hidden md:inline">Refresh</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
