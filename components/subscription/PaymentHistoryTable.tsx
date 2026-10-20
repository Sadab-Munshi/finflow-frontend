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

interface PaymentHistoryTableProps {
  orders: PaymentOrderRecord[]
  verifyingOrderId?: string | null
  onSelectOrder: (order: PaymentOrderRecord) => void
  onVerifyOrder?: (orderId: string) => void
}

export function PaymentHistoryTable({
  orders,
  verifyingOrderId = null,
  onSelectOrder,
  onVerifyOrder,
}: PaymentHistoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            <th className="py-3.5 px-5">Plan</th>
            <th className="py-3.5 px-4">Date & Time</th>
            <th className="py-3.5 px-4">Method</th>
            <th className="py-3.5 px-4">Amount</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0] text-sm">
          {orders.map((order) => {
            const planTitle = getPlanDisplayName(order.plan_id)
            const statusInfo = normalizePaymentStatus(order.status)
            const isPending = statusInfo.status === 'pending'
            const isVerifying = verifyingOrderId === order.order_id

            return (
              <tr
                key={order.order_id}
                className="hover:bg-[#F8FAFC]/80 transition-colors"
              >
                <td className="py-4 px-5 font-semibold text-[#0F172A]">
                  {planTitle}
                </td>
                <td className="py-4 px-4 text-[#475569] whitespace-nowrap">
                  {formatLocalizedDateTime(order.paid_at || order.created_at)}
                </td>
                <td className="py-4 px-4 text-[#475569]">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#334155]">
                    {order.payment_method || 'UPI'}
                  </span>
                </td>
                <td
                  className="py-4 px-4 font-bold text-[#0F172A] whitespace-nowrap"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatInrCurrency(Number(order.amount_inr || 0))}
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <PaymentStatusBadge status={order.status} size="sm" />
                </td>
                <td className="py-4 px-5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-2">
                    {isPending && onVerifyOrder && (
                      <button
                        type="button"
                        onClick={() => onVerifyOrder(order.order_id)}
                        disabled={isVerifying}
                        className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-xs font-semibold transition-colors disabled:opacity-60"
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
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
