'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ShieldCheck,
  Zap,
  CalendarCheck,
  ArrowRight,
  ReceiptText,
  Sparkles,
  Loader2,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import {
  getSubscriptionStatus,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  startSubscriptionFreeTrial,
} from '@/lib/api-client'
import { openYoupiCheckout } from '@/lib/youpi-checkout'
import { useUser } from '@/context/UserContext'
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate'
import { TIER_DISPLAY_NAMES } from '@/lib/subscription-gate'
import { useTranslations } from 'next-intl'
import {
  getPlanDisplayName,
  normalizePaymentStatus,
  type SubscriptionPlan,
  type CustomerFacingPlan,
  type UserSubscriptionState,
  type AiQuotasPayload,
  type PaymentOrderRecord,
  type PlanId,
} from '@/lib/subscription-utils'
import { SubscriptionPageHeader } from '@/components/subscription/SubscriptionPageHeader'
import { CurrentPlanCard } from '@/components/subscription/CurrentPlanCard'
import { UsageOverview } from '@/components/subscription/UsageOverview'
import { PlanComparison } from '@/components/subscription/PlanComparison'
import { PaymentHistoryList } from '@/components/subscription/PaymentHistoryList'
import { PaymentHistoryTable } from '@/components/subscription/PaymentHistoryTable'
import { PaymentDetails } from '@/components/subscription/PaymentDetails'
import { PurchaseReview } from '@/components/subscription/PurchaseReview'
import {
  SubscriptionNoticeBanner,
  SubscriptionLoadingSkeleton,
  EmptyPaymentHistory,
  ErrorStateCard,
  type NoticeBannerState,
} from '@/components/subscription/AsyncState'

function SubscriptionContent() {
  const searchParams = useSearchParams()
  const { user, refreshProfile } = useUser()
  const tGate = useTranslations('subscriptionGate')
  const {
    subscriptionsEnabled,
    paymentsEnabled,
    trialEnabled: gateTrialEnabled,
    trialDays: gateTrialDays,
    override: adminOverride,
    userTier,
    refresh: refreshGate,
  } = useSubscriptionGate()

  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [subscription, setSubscription] = useState<UserSubscriptionState | null>(null)
  const [quotas, setQuotas] = useState<AiQuotasPayload | null>(null)
  const [orders, setOrders] = useState<PaymentOrderRecord[]>([])
  const [trialEnabledFromApi, setTrialEnabledFromApi] = useState<boolean | null>(null)
  const [trialDaysFromApi, setTrialDaysFromApi] = useState<number | null>(null)
  const [trialUsed, setTrialUsed] = useState(false)
  const [startingTrial, setStartingTrial] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [reviewPlan, setReviewPlan] = useState<(CustomerFacingPlan | SubscriptionPlan) | null>(
    null
  )
  const [processingPlanId, setProcessingPlanId] = useState<PlanId | null>(null)
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrderRecord | null>(null)
  const [notice, setNotice] = useState<NoticeBannerState | null>(null)

  const fetchSubscriptionState = useCallback(async (quiet = false) => {
    if (!quiet) {
      setLoading(true)
      setLoadError(null)
    } else {
      setRefreshing(true)
    }

    try {
      const res = await getSubscriptionStatus()
      const payload = (res as any)?.data ? (res as any).data : (res as any)

      if (payload && (payload.plans || payload.subscription)) {
        setPlans(payload.plans || [])
        setSubscription(payload.subscription || null)
        setQuotas(payload.usage || payload.quotas || null)
        setOrders(payload.orders || [])
        if (typeof payload.trialEnabled === 'boolean') {
          setTrialEnabledFromApi(payload.trialEnabled)
        }
        if (typeof payload.trialDays === 'number') {
          setTrialDaysFromApi(payload.trialDays)
        }
        if (typeof payload.trialUsed === 'boolean') {
          setTrialUsed(payload.trialUsed)
        }
        setLoadError(null)
      } else {
        setLoadError('Unable to load your subscription details right now.')
      }
    } catch (err: any) {
      if (!quiet) {
        setLoadError(
          err?.message || 'Unable to connect to the subscription service. Please try again.'
        )
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const verifyOrderById = useCallback(
    async (
      orderId: string,
      options?: { paymentId?: string; utr?: string; showPendingNotice?: boolean }
    ) => {
      const showPendingNotice = options?.showPendingNotice ?? true
      setVerifyingOrderId(orderId)
      try {
        const res = await verifySubscriptionPayment({
          orderId,
          paymentId: options?.paymentId,
          utr: options?.utr,
        })
        const payload = (res as any)?.data ? (res as any).data : (res as any)

        if (payload?.verified && (payload?.status === 'SUCCESS' || payload?.subscription?.status === 'active')) {
          if (payload.subscription) {
            setSubscription(payload.subscription)
          }
          if (payload.usage || payload.quotas) {
            setQuotas(payload.usage || payload.quotas)
          }
          const activatedName = getPlanDisplayName(
            payload.subscription?.planId,
            payload.subscription?.planName
          )
          setNotice({
            type: 'success',
            title: `${activatedName} Activated`,
            message: `Your UPI payment has been confirmed and your ${activatedName} allowance is now active.`,
          })
          await fetchSubscriptionState(true)
          await refreshProfile().catch(() => {})
          return true
        } else if (showPendingNotice) {
          setNotice({
            type: 'info',
            title: 'Payment Confirmation in Progress',
            message:
              'If you have completed the transfer in your UPI app, your pass will activate automatically within a few seconds.',
          })
          await fetchSubscriptionState(true)
        }
      } catch (err: any) {
        if (showPendingNotice) {
          setNotice({
            type: 'error',
            title: 'Could Not Verify Payment Status',
            message:
              err?.message ||
              'We could not verify this transaction right now. Please try checking again shortly.',
          })
        }
      } finally {
        setVerifyingOrderId(null)
      }
      return false
    },
    [fetchSubscriptionState]
  )

  useEffect(() => {
    fetchSubscriptionState()
  }, [fetchSubscriptionState])

  // Auto-verify if returning from UPI redirect flow (?payment=return&orderId=...)
  useEffect(() => {
    const paymentFlag = searchParams?.get('payment')
    const returnOrderId = searchParams?.get('orderId')
    if (returnOrderId && (paymentFlag === 'return' || paymentFlag === 'success')) {
      verifyOrderById(returnOrderId, { showPendingNotice: true })
      if (typeof window !== 'undefined') {
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
      }
    }
  }, [searchParams, verifyOrderById])

  const handleConfirmPurchase = async (plan: CustomerFacingPlan | SubscriptionPlan) => {
    if (plan.id === 'free') return
    if (!paymentsEnabled) {
      setReviewPlan(null)
      setNotice({
        type: 'error',
        title: tGate('paymentsPausedBannerTitle'),
        message: tGate('paymentsPausedBannerDesc'),
      })
      return
    }
    setProcessingPlanId(plan.id)
    setNotice(null)

    try {
      const orderRes = await createSubscriptionOrder(plan.id)
      const orderData = (orderRes as any)?.data
        ? (orderRes as any).data
        : (orderRes as any)

      if (!orderData?.checkoutUrl && !orderData?.paymentId) {
        throw new Error(
          (orderRes as any)?.error || 'Could not initialize UPI checkout session.'
        )
      }

      const {
        orderId,
        paymentId,
        checkoutUrl,
        sdkUrl,
        amountInr,
        planName,
      } = orderData

      setReviewPlan(null)

      await openYoupiCheckout({
        sdkUrl,
        checkoutUrl,
        paymentId,
        orderId,
        amount: amountInr || plan.priceInr,
        currency: 'INR',
        name: 'FinFlow Pro',
        description: `${planName || plan.name} Pass`,
        customer: {
          name: user?.userName || 'FinFlow User',
          email: user?.email || undefined,
        },
        onSuccess: async (result) => {
          await verifyOrderById(orderId, {
            paymentId,
            utr: result.utr,
            showPendingNotice: true,
          })
        },
        onFailed: async (result) => {
          setNotice({
            type: 'error',
            title: 'Payment Not Completed',
            message:
              result.reason ||
              'Your UPI payment did not go through. No amount was charged to your pass.',
          })
          await fetchSubscriptionState(true)
        },
        onExpired: async () => {
          setNotice({
            type: 'info',
            title: 'Payment Session Expired',
            message:
              'Your payment window expired before completion. You can start a new UPI payment anytime.',
          })
          await fetchSubscriptionState(true)
        },
        onSuspicious: async () => {
          setNotice({
            type: 'info',
            title: 'Payment Under Verification',
            message:
              'Your payment is being verified by the bank. Please check the status in Recent Payments shortly.',
          })
          await fetchSubscriptionState(true)
        },
        onCancelled: async () => {
          const verified = await verifyOrderById(orderId, {
            paymentId,
            showPendingNotice: false,
          })
          if (!verified) {
            setNotice({
              type: 'info',
              title: 'Checkout Closed',
              message:
                'Already completed the transfer in your UPI app? Use "Check Status" in Recent Payments below to refresh your pass.',
            })
            await fetchSubscriptionState(true)
          }
        },
      })
    } catch (err: any) {
      setNotice({
        type: 'error',
        title: 'Unable to Start UPI Checkout',
        message:
          err?.message ||
          'Please check your internet connection and try selecting the plan again.',
      })
    } finally {
      setProcessingPlanId(null)
    }
  }

  const handleStartFreeTrial = async () => {
    setStartingTrial(true)
    setNotice(null)
    try {
      const res = await startSubscriptionFreeTrial()
      const payload = (res as any)?.data ? (res as any).data : (res as any)
      if (!res.ok || payload?.ok === false) {
        const msg =
          payload?.message ||
          payload?.error ||
          (res as any)?.error ||
          'Unable to start free trial right now.'
        if (payload?.code === 'TRIAL_ALREADY_USED') {
          setTrialUsed(true)
        }
        setNotice({
          type: 'error',
          title: 'Free Trial Unavailable',
          message: msg,
        })
        await fetchSubscriptionState(true)
        return
      }

      setTrialUsed(true)
      if (payload?.subscription) {
        setSubscription(payload.subscription)
      }
      if (payload?.usage || payload?.quotas) {
        setQuotas(payload.usage || payload.quotas)
      }
      setNotice({
        type: 'success',
        title: `${payload?.trialDays || effectiveTrialDays}-Day Free Trial Activated`,
        message:
          'Your Pro Free Trial is now active! Confirmation notifications have been sent to your active channels.',
      })
      await Promise.all([
        fetchSubscriptionState(true),
        refreshGate().catch(() => {}),
        refreshProfile().catch(() => {}),
      ])
    } catch (err: any) {
      setNotice({
        type: 'error',
        title: 'Unable to Start Free Trial',
        message: err?.message || 'Please check your connection and try again.',
      })
    } finally {
      setStartingTrial(false)
    }
  }

  const scrollToPlans = () => {
    const el = document.getElementById('plans-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const latestPaidOrder =
    orders.find((o) => normalizePaymentStatus(o.status).status === 'paid') || null
  const recentOrders = orders.slice(0, 3)

  const isPaidActive =
    subscription?.status === 'active' && subscription.planId !== 'free'
  const effectiveTrialEnabled = trialEnabledFromApi ?? gateTrialEnabled
  const effectiveTrialDays = trialDaysFromApi ?? gateTrialDays
  const showFreeTrialOffer =
    subscriptionsEnabled &&
    effectiveTrialEnabled &&
    effectiveTrialDays > 0 &&
    !trialUsed &&
    !isPaidActive
  const effectiveMultiplier = Math.max(
    1,
    Number(subscription?.aiMultiplier) ||
      (subscription?.planId === 'pro_monthly' || subscription?.planId === 'trial_7d'
        ? 5
        : 1)
  )

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[#F0FDFA]/70 via-[#F8FAFC] to-amber-50/30">
        <SubscriptionPageHeader
          title="Subscription & Billing"
          subtitle="Manage your FinFlow AI allowance, prepaid passes, and payment receipts"
          backHref="/dashboard"
          backLabel="Back to Dashboard"
          showHistoryLink={false}
          isPro={isPaidActive}
          planBadgeText={
            subscription?.planId === 'pro_yearly'
              ? 'MAX YEARLY'
              : subscription?.planId === 'pro_monthly'
              ? 'PRO MONTHLY'
              : 'PRO PASS'
          }
          onRefresh={() => fetchSubscriptionState(true)}
          refreshing={refreshing}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
          {/* Live Global Controls Banners (Open Access / Payments Paused / Super-Admin Override) */}
          {!subscriptionsEnabled && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-5 py-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-950">{tGate('openAccessTitle')}</p>
                <p className="text-xs text-emerald-800 mt-0.5">{tGate('openAccessDesc')}</p>
              </div>
            </div>
          )}

          {!paymentsEnabled && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4 flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-950">{tGate('paymentsPausedBannerTitle')}</p>
                <p className="text-xs text-amber-800 mt-0.5">{tGate('paymentsPausedBannerDesc')}</p>
              </div>
            </div>
          )}

          {adminOverride && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/80 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-teal-950">
                  {tGate('overrideBadge', { tier: TIER_DISPLAY_NAMES[userTier] })}
                </p>
                <p className="text-xs text-teal-800 mt-0.5">
                  Status: <span className="font-semibold capitalize">{adminOverride.status}</span>
                  {adminOverride.trial_ends_at
                    ? ` · Trial ends ${new Date(adminOverride.trial_ends_at).toLocaleDateString('en-IN')}`
                    : ''}
                  {adminOverride.expires_at
                    ? ` · Expires ${new Date(adminOverride.expires_at).toLocaleDateString('en-IN')}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  refreshGate()
                  fetchSubscriptionState(true)
                }}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Refresh status
              </button>
            </div>
          )}

          {/* Status / Verification Notice Banner */}
          <SubscriptionNoticeBanner
            notice={notice}
            onDismiss={() => setNotice(null)}
          />

          {loading ? (
            <SubscriptionLoadingSkeleton />
          ) : loadError ? (
            <ErrorStateCard
              message={loadError}
              onRetry={() => fetchSubscriptionState(false)}
            />
          ) : (
            <>
              {/* 1. Current Plan Summary Card */}
              <CurrentPlanCard
                subscription={subscription}
                latestPaidOrder={latestPaidOrder}
                onUpgradeClick={scrollToPlans}
                onViewLatestReceipt={(order) => setSelectedOrder(order)}
              />

              {/* One-Time Free Trial Banner (shown strictly when trial_enabled & unused) */}
              {showFreeTrialOffer && (
                <section
                  aria-label="Free trial offer"
                  className="rounded-2xl border border-teal-300/80 bg-gradient-to-r from-[#042F2E] via-[#115E59] to-[#0F766E] text-white p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      {tGate('freeTrialBadge')}
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold text-white">
                      {tGate('freeTrialTitle', { days: effectiveTrialDays })}
                    </h3>
                    <p className="text-xs text-teal-100 leading-relaxed">
                      {tGate('freeTrialDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartFreeTrial}
                    disabled={startingTrial}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs sm:text-sm font-extrabold shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {startingTrial ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>{tGate('freeTrialStarting')}</span>
                      </>
                    ) : (
                      <>
                        <span>{tGate('freeTrialCta', { days: effectiveTrialDays })}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>
                </section>
              )}

              {/* 2. Monthly Feature Usage Overview */}
              <UsageOverview
                quotas={quotas}
                unlimitedAi={Boolean(subscription?.unlimitedAi)}
                aiMultiplier={effectiveMultiplier}
              />

              {/* 3. Plan Comparison & Upgrade Cards */}
              <PlanComparison
                plans={plans}
                currentPlanId={subscription?.planId || 'free'}
                currentStatus={subscription?.status || 'free'}
                processingPlanId={processingPlanId}
                onSelectPlan={(plan) => {
                  if (!paymentsEnabled) {
                    setNotice({
                      type: 'error',
                      title: tGate('paymentsPausedBannerTitle'),
                      message: tGate('paymentsPausedBannerDesc'),
                    })
                    return
                  }
                  setReviewPlan(plan)
                }}
              />

              {/* 4. Recent Payments Preview */}
              <section
                aria-label="Recent payments"
                className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                      Recent Payments
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B]">
                      Your latest pass purchases and digital receipts
                    </p>
                  </div>

                  {orders.length > 0 && (
                    <Link
                      href="/subscription/payments"
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#0F766E] hover:bg-[#F0FDFA] transition-colors shrink-0"
                    >
                      <span>View All ({orders.length})</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>

                {recentOrders.length === 0 ? (
                  <EmptyPaymentHistory
                    actionLabel="Explore Pro Passes"
                    onAction={scrollToPlans}
                  />
                ) : (
                  <>
                    <div className="md:hidden">
                      <PaymentHistoryList
                        orders={recentOrders}
                        verifyingOrderId={verifyingOrderId}
                        onSelectOrder={(order) => setSelectedOrder(order)}
                        onVerifyOrder={(orderId) =>
                          verifyOrderById(orderId, { showPendingNotice: true })
                        }
                      />
                    </div>
                    <div className="hidden md:block">
                      <PaymentHistoryTable
                        orders={recentOrders}
                        verifyingOrderId={verifyingOrderId}
                        onSelectOrder={(order) => setSelectedOrder(order)}
                        onVerifyOrder={(orderId) =>
                          verifyOrderById(orderId, { showPendingNotice: true })
                        }
                      />
                    </div>

                    {orders.length > 3 && (
                      <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center">
                        <Link
                          href="/subscription/payments"
                          className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F766E] hover:text-[#115E59]"
                        >
                          <ReceiptText className="w-4 h-4" />
                          <span>View complete payment history ({orders.length} records)</span>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* 5. Customer-Facing Billing Reassurance Footer */}
              <section
                aria-label="Billing guarantees"
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0F766E] shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Instant UPI Activation
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Pay with Google Pay, PhonePe, Paytm, or any UPI app. Your pass activates as soon as the transfer completes.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0F766E] shrink-0">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      No Recurring Auto-Debit
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Every FinFlow pass is a fixed-duration prepaid purchase. You are never billed automatically when your pass ends.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0F766E] shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Verified Bank Receipts
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Every completed payment includes a downloadable receipt with your UPI bank reference (UTR) for your records.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Purchase Review Modal */}
        <PurchaseReview
          plan={reviewPlan}
          currentSubscription={subscription}
          isProcessing={processingPlanId !== null}
          onConfirm={handleConfirmPurchase}
          onCancel={() => setReviewPlan(null)}
        />

        {/* Transaction Receipt / Details Modal */}
        <PaymentDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onVerifyOrder={(orderId) =>
            verifyOrderById(orderId, { showPendingNotice: true })
          }
          verifyingOrderId={verifyingOrderId}
        />
      </div>
    </Layout>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SubscriptionLoadingSkeleton />
          </div>
        </Layout>
      }
    >
      <SubscriptionContent />
    </Suspense>
  )
}
