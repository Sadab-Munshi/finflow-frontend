'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Copy,
  Check,
  Printer,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ReceiptText,
} from 'lucide-react'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import {
  formatInrCurrency,
  formatLocalizedDateTime,
  getPlanDisplayName,
  normalizePaymentStatus,
  type PaymentOrderRecord,
} from '@/lib/subscription-utils'

interface PaymentDetailsProps {
  order: PaymentOrderRecord | null
  onClose: () => void
  onVerifyOrder?: (orderId: string) => void
  verifyingOrderId?: string | null
}

export function PaymentDetails({
  order,
  onClose,
  onVerifyOrder,
  verifyingOrderId = null,
}: PaymentDetailsProps) {
  const [copiedField, setCopiedField] = useState<'order' | 'utr' | null>(null)

  useEffect(() => {
    if (!order) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [order, onClose])

  if (!order) return null

  const statusInfo = normalizePaymentStatus(order.status)
  const planName = getPlanDisplayName(order.plan_id)
  const isVerifying = verifyingOrderId === order.order_id

  const copyText = async (value: string, field: 'order' | 'utr') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Clipboard fallback ignored
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-details-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0F766E] shrink-0">
              <ReceiptText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="payment-details-title"
                className="text-base font-bold text-[#0F172A] truncate"
              >
                {statusInfo.status === 'paid' ? 'Payment Receipt' : 'Transaction Details'}
              </h2>
              <p className="text-xs text-[#64748B] truncate">FinFlow Subscription Billing</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction details"
            className="w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] flex items-center justify-center text-[#475569] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Amount & Status Hero */}
          <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-center space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
              {planName}
            </p>
            <p
              className="text-3xl font-extrabold text-[#0F172A]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatInrCurrency(Number(order.amount_inr || 0), { showDecimals: true })}
            </p>
            <div className="flex justify-center pt-1">
              <PaymentStatusBadge status={order.status} size="md" />
            </div>
            <p className="text-xs text-[#475569] pt-1">{statusInfo.description}</p>
          </div>

          {/* Metadata rows */}
          <dl className="divide-y divide-[#E2E8F0] text-xs sm:text-sm">
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-[#64748B]">Plan</dt>
              <dd className="font-semibold text-[#0F172A] text-right">{planName}</dd>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-[#64748B]">Date & Time</dt>
              <dd className="font-medium text-[#0F172A] text-right">
                {formatLocalizedDateTime(order.paid_at || order.created_at)}
              </dd>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-[#64748B]">Payment Method</dt>
              <dd className="font-medium text-[#0F172A] text-right">
                {order.payment_method || 'UPI'}
              </dd>
            </div>

            {order.utr && (
              <div className="py-2.5 flex items-center justify-between gap-3">
                <dt className="text-[#64748B] shrink-0">Bank Ref (UTR)</dt>
                <dd className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="font-mono text-xs font-semibold text-[#0F766E] truncate"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {order.utr}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(order.utr!, 'utr')}
                    aria-label="Copy bank reference number"
                    className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#475569] transition-colors shrink-0"
                  >
                    {copiedField === 'utr' ? (
                      <Check className="w-3.5 h-3.5 text-[#059669]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </dd>
              </div>
            )}

            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-[#64748B] shrink-0">Reference ID</dt>
              <dd className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs text-[#475569] truncate max-w-[180px] sm:max-w-[220px]">
                  {order.order_id}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(order.order_id, 'order')}
                  aria-label="Copy reference ID"
                  className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#475569] transition-colors shrink-0"
                >
                  {copiedField === 'order' ? (
                    <Check className="w-3.5 h-3.5 text-[#059669]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </dd>
            </div>
          </dl>

          <div className="rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] p-3 flex items-center gap-2.5 text-xs text-[#0F766E]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              One-time prepaid pass payment. No recurring charges or automatic renewals.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-2.5">
          {statusInfo.status === 'pending' && onVerifyOrder && (
            <button
              type="button"
              onClick={() => onVerifyOrder(order.order_id)}
              disabled={isVerifying}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <RefreshCw className="w-4 h-4 shrink-0" />
              )}
              <span>Verify Payment Status</span>
            </button>
          )}

          {statusInfo.status === 'paid' && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#0F172A] text-xs sm:text-sm font-semibold transition-colors"
            >
              <Printer className="w-4 h-4 text-[#0F766E] shrink-0" />
              <span>Print Receipt</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#475569] text-xs sm:text-sm font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
