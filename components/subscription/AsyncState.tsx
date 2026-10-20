'use client'

import React from 'react'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ReceiptText,
  RefreshCw,
  X,
} from 'lucide-react'

export interface NoticeBannerState {
  type: 'success' | 'info' | 'error'
  title: string
  message: string
}

interface NoticeBannerProps {
  notice: NoticeBannerState | null
  onDismiss: () => void
}

export function SubscriptionNoticeBanner({ notice, onDismiss }: NoticeBannerProps) {
  if (!notice) return null

  const styles =
    notice.type === 'success'
      ? {
          container: 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]',
          Icon: CheckCircle2,
          iconColor: 'text-[#059669]',
        }
      : notice.type === 'error'
      ? {
          container: 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]',
          Icon: AlertCircle,
          iconColor: 'text-[#DC2626]',
        }
      : {
          container: 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]',
          Icon: Clock,
          iconColor: 'text-[#D97706]',
        }

  const Icon = styles.Icon

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border p-4 flex items-start justify-between gap-3 shadow-xs ${styles.container}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${styles.iconColor}`} />
        <div className="min-w-0">
          <p className="text-sm font-bold">{notice.title}</p>
          <p className="text-xs sm:text-sm mt-0.5 leading-relaxed opacity-95">
            {notice.message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="p-1.5 rounded-lg hover:bg-black/5 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function SubscriptionLoadingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading subscription details"
      className="space-y-6 animate-pulse"
    >
      {/* Current Plan Skeleton */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-4">
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-[#E2E8F0]" />
          <div className="h-6 w-40 rounded-full bg-[#F1F5F9]" />
        </div>
        <div className="h-8 w-52 rounded-lg bg-[#E2E8F0]" />
        <div className="h-4 w-72 max-w-full rounded bg-[#F1F5F9]" />
      </div>

      {/* Usage Skeleton */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-4">
        <div className="h-6 w-48 rounded bg-[#E2E8F0]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-3"
            >
              <div className="h-4 w-28 rounded bg-[#E2E8F0]" />
              <div className="h-3 w-20 rounded bg-[#F1F5F9]" />
              <div className="h-2 w-full rounded-full bg-[#E2E8F0]" />
            </div>
          ))}
        </div>
      </div>

      {/* Plans Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-80 rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-4"
          >
            <div className="h-5 w-24 rounded-full bg-[#E2E8F0]" />
            <div className="h-6 w-36 rounded bg-[#E2E8F0]" />
            <div className="h-10 w-28 rounded bg-[#E2E8F0]" />
            <div className="space-y-2 pt-3">
              <div className="h-3.5 w-full rounded bg-[#F1F5F9]" />
              <div className="h-3.5 w-5/6 rounded bg-[#F1F5F9]" />
              <div className="h-3.5 w-4/6 rounded bg-[#F1F5F9]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface EmptyPaymentHistoryProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyPaymentHistory({
  title = 'No payments yet',
  description = 'When you purchase a FinFlow Pro pass via UPI, your digital receipts and transaction records will appear here.',
  actionLabel,
  onAction,
}: EmptyPaymentHistoryProps) {
  return (
    <div className="py-10 px-4 text-center max-w-md mx-auto space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0F766E] mx-auto">
        <ReceiptText className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-[#0F172A]">{title}</h3>
      <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}

interface ErrorStateCardProps {
  title?: string
  message: string
  onRetry: () => void
}

export function ErrorStateCard({
  title = 'Could not load subscription details',
  message,
  onRetry,
}: ErrorStateCardProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-white border border-[#FECACA] p-6 text-center max-w-lg mx-auto space-y-3 shadow-xs"
    >
      <div className="w-11 h-11 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] mx-auto">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h2 className="text-base font-bold text-[#0F172A]">{title}</h2>
      <p className="text-xs sm:text-sm text-[#475569]">{message}</p>
      <div className="pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs sm:text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  )
}
