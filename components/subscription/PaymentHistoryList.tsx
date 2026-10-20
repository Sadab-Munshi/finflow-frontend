'use client'

import React from 'react'
import { ChevronRight, RefreshCw, Loader2 } from 'lucide-react'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import {
  formatInrCurrency,
  formatLocalizedDateTime,
  getPlanDisplayName,
  normalizePaymentStatus,
  type PaymentOrderRecord,
} from '@/lib/subscription-utils'

interface PaymentHistoryListProps {
  orders: PaymentOrderRecord[]
  verifyingOrderId?: string | null
  onSelectOrder: (order: PaymentOrderRecord) => void
  onVerifyOrder?: (orderId: string) => void
}

export function PaymentHistoryList({
  orders,
  verifyingOrderId = null,
  onSelectOrder,
  onVerifyOrder,
}: PaymentHistoryListProps) {
  return (
    <div className="divide-y divide-[#E2E8F0]" role="list" aria-label="Payment transactions">
      {orders.map((order) => {
        const planTitle = getPlanDisplayName(order.plan_id)
        const statusInfo = normalizePaymentStatus(order.status)
        const isPending = statusInfo.status === 'pending'
        const isVerifying = verifyingOrderId === order.order_id

        return (
          <div
            key={order.order_id}
            role="listitem"
            className="p-4 sm:p-5 hover:bg-[#F8FAFC] transition-colors flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0F172A] truncate">
                  {planTitle}
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {formatLocalizedDateTime(order.paid_at || order.created_at)}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p
                  className="text-base font-extrabold text-[#0F172A]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatInrCurrency(Number(order.amount_inr || 0))}
                </p>
                <div className="mt-1 flex justify-end">
                  <PaymentStatusBadge status={order.status} size="sm" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
              <span className="text-xs text-[#64748B]">
                {order.payment_method || 'UPI'}
                {order.utr ? ' · Bank Ref Recorded' : ''}
              </span>

              <div className="flex items-center gap-2">
                {isPending && onVerifyOrder && (
                  <button
                    type="button"
                    onClick={() => onVerifyOrder(order.order_id)}
                    disabled={isVerifying}
                    className="inline-flex items-center gap-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>Check Status</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSelectOrder(order)}
                  className="inline-flex items-center gap-1 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                >
                  <span>{statusInfo.status === 'paid' ? 'Receipt' : 'Details'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
