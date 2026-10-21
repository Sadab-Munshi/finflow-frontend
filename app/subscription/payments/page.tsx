'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import {
  getSubscriptionStatus,
  verifySubscriptionPayment,
} from '@/lib/api-client'
import {
  formatInrCurrency,
  getPlanDisplayName,
  normalizePaymentStatus,
  type PaymentOrderRecord,
} from '@/lib/subscription-utils'
import { SubscriptionPageHeader } from '@/components/subscription/SubscriptionPageHeader'
import { PaymentHistoryList } from '@/components/subscription/PaymentHistoryList'
import { PaymentHistoryTable } from '@/components/subscription/PaymentHistoryTable'
import { PaymentDetails } from '@/components/subscription/PaymentDetails'
import {
  SubscriptionNoticeBanner,
  EmptyPaymentHistory,
  ErrorStateCard,
  type NoticeBannerState,
} from '@/components/subscription/AsyncState'

type StatusFilter = 'all' | 'paid' | 'pending' | 'unsuccessful'

export default function SubscriptionPaymentsPage() {
  const router = useRouter()

  const [orders, setOrders] = useState<PaymentOrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrderRecord | null>(null)
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null)
  const [notice, setNotice] = useState<NoticeBannerState | null>(null)

  interface OrdersStatusResponse {
    data?: OrdersStatusResponse
    orders?: PaymentOrderRecord[]
  }

  interface VerifyOrderResponse {
    data?: VerifyOrderResponse
    verified?: boolean
    status?: string
    subscription?: { planId?: string; planName?: string } | null
  }

  const fetchOrders = useCallback(async (quiet = false) => {
    if (!quiet) {
      setLoading(true)
      setLoadError(null)
    } else {
      setRefreshing(true)
    }

    try {
      const res = (await getSubscriptionStatus()) as OrdersStatusResponse
      const payload = res?.data ? res.data : res

      if (payload && Array.isArray(payload.orders)) {
        setOrders(payload.orders)
        setLoadError(null)
      } else {
        setOrders([])
      }
    } catch (err: unknown) {
      if (!quiet) {
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Unable to load your payment history. Please try again.'
        )
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => fetchOrders())
  }, [fetchOrders])

  const handleVerifyOrder = async (orderId: string) => {
    setVerifyingOrderId(orderId)
    try {
      const res = (await verifySubscriptionPayment({ orderId })) as VerifyOrderResponse
      const payload = res?.data ? res.data : res

      if (payload?.verified && payload?.status === 'SUCCESS') {
        const planTitle = getPlanDisplayName(
          payload.subscription?.planId,
          payload.subscription?.planName
        )
        setNotice({
          type: 'success',
          title: 'Payment Confirmed',
          message: `Your payment has been verified and your ${planTitle} pass is active.`,
        })
        await fetchOrders(true)
      } else {
        setNotice({
          type: 'info',
          title: 'Still Awaiting Bank Confirmation',
          message:
            'This transaction has not been marked as paid yet. If you completed the UPI transfer, please check again in a moment.',
        })
        await fetchOrders(true)
      }
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        title: 'Verification Check Failed',
        message:
          err instanceof Error
            ? err.message
            : 'Could not check payment status right now. Please try again.',
      })
    } finally {
      setVerifyingOrderId(null)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const normalized = normalizePaymentStatus(order.status).status

      if (statusFilter === 'paid' && normalized !== 'paid') return false
      if (statusFilter === 'pending' && normalized !== 'pending') return false
      if (
        statusFilter === 'unsuccessful' &&
        normalized !== 'failed' &&
        normalized !== 'expired'
      ) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const planLabel = getPlanDisplayName(order.plan_id).toLowerCase()
        const utr = (order.utr || '').toLowerCase()
        const orderId = (order.order_id || '').toLowerCase()
        return planLabel.includes(q) || utr.includes(q) || orderId.includes(q)
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  const summary = useMemo(() => {
    const paidOrders = orders.filter(
      (o) => normalizePaymentStatus(o.status).status === 'paid'
    )
    const totalSpentInr = paidOrders.reduce(
      (sum, o) => sum + Number(o.amount_inr || 0),
      0
    )
    return {
      totalCount: orders.length,
      paidCount: paidOrders.length,
      totalSpentInr,
    }
  }, [orders])

  return (
    <Layout>
      <div className="min-h-screen bg-[#F8FAFC]">
        <SubscriptionPageHeader
          title="Payment History"
          subtitle="View all your FinFlow pass transactions, statuses, and digital receipts"
          backHref="/subscription"
          backLabel="Back to Subscription"
          showHistoryLink={false}
          onRefresh={() => fetchOrders(true)}
          refreshing={refreshing}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
          <SubscriptionNoticeBanner
            notice={notice}
            onDismiss={() => setNotice(null)}
          />

          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-5">
              <p className="text-xs font-medium text-[#64748B]">Total Transactions</p>
              <p
                className="text-2xl font-extrabold text-[#0F172A] mt-1"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {summary.totalCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-5">
              <p className="text-xs font-medium text-[#64748B]">Completed Payments</p>
              <p
                className="text-2xl font-extrabold text-[#059669] mt-1"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {summary.paidCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-5">
              <p className="text-xs font-medium text-[#64748B]">Total Paid</p>
              <p
                className="text-2xl font-extrabold text-[#0F172A] mt-1"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatInrCurrency(summary.totalSpentInr)}
              </p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
              {/* Filter Tabs */}
              <div
                role="tablist"
                aria-label="Filter payments by status"
                className="flex flex-wrap items-center gap-1.5"
              >
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'paid', label: 'Paid' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'unsuccessful', label: 'Expired / Failed' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
                      statusFilter === tab.id
                        ? 'bg-[#0F766E] text-white'
                        : 'bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] border border-[#E2E8F0]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search plan or bank ref..."
                  aria-label="Search payment history"
                  className="w-full min-h-[40px] pl-9 pr-8 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs sm:text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List / Table Content */}
            {loading ? (
              <div className="p-6 space-y-4 animate-pulse">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-16 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="p-6">
                <ErrorStateCard
                  message={loadError}
                  onRetry={() => fetchOrders(false)}
                />
              </div>
            ) : filteredOrders.length === 0 ? (
              <EmptyPaymentHistory
                title={
                  orders.length === 0
                    ? 'No payment records yet'
                    : 'No matching transactions'
                }
                description={
                  orders.length === 0
                    ? 'Your completed UPI pass purchases and receipts will appear here.'
                    : 'Try changing the status filter or clearing your search query.'
                }
                actionLabel={orders.length === 0 ? 'View Plans' : 'Reset Filters'}
                onAction={() => {
                  if (orders.length === 0) {
                    router.push('/subscription')
                  } else {
                    setStatusFilter('all')
                    setSearchQuery('')
                  }
                }}
              />
            ) : (
              <>
                <div className="md:hidden">
                  <PaymentHistoryList
                    orders={filteredOrders}
                    verifyingOrderId={verifyingOrderId}
                    onSelectOrder={(order) => setSelectedOrder(order)}
                    onVerifyOrder={handleVerifyOrder}
                  />
                </div>
                <div className="hidden md:block">
                  <PaymentHistoryTable
                    orders={filteredOrders}
                    verifyingOrderId={verifyingOrderId}
                    onSelectOrder={(order) => setSelectedOrder(order)}
                    onVerifyOrder={handleVerifyOrder}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Receipt / Details Modal */}
        <PaymentDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onVerifyOrder={handleVerifyOrder}
          verifyingOrderId={verifyingOrderId}
        />
      </div>
    </Layout>
  )
}
