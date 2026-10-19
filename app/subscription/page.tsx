"use client"

import React, { useEffect, useState, useCallback } from "react"
import Layout from "@/components/layout/Layout"
import { useUser } from "@/context/UserContext"
import {
  createSubscriptionOrder,
  getSubscriptionStatus,
  verifySubscriptionPayment,
  type PlanId,
  type SubscriptionPlan,
  type UserSubscriptionStatus,
  type PaymentOrderRecord,
} from "@/lib/api-client"
import { openYoupiCheckout } from "@/lib/youpi-checkout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Crown,
  FlaskConical,
  RefreshCw,
  Clock,
  Receipt,
  Mic,
  MessageSquareText,
  Lightbulb,
  ArrowUpRight,
  Lock,
  AlertCircle,
  X,
} from "lucide-react"

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free Starter",
    tagline: "Essential personal finance & starter AI limits",
    priceInr: 0,
    pricePaise: 0,
    durationDays: 0,
    aiMultiplier: 1,
    unlimitedAi: false,
    features: [
      "60 AI NLP expense parses / month",
      "15 AI receipt scans / month",
      "50 AI voice commands / month",
      "30 AI financial insights / month",
      "Telegram & WhatsApp bot sync",
    ],
  },
  {
    id: "test_1inr",
    name: "₹1 Live Test Pass",
    tagline: "24-hour Pro trial to verify live UPI checkout & 2x AI limits",
    priceInr: 1,
    pricePaise: 100,
    durationDays: 1,
    aiMultiplier: 2,
    unlimitedAi: false,
    badge: "Live Gateway Test",
    features: [
      "Live ₹1 UPI payment via YOUPI PG",
      "2x AI limits for 24 hours (120 NLP, 30 Receipts)",
      "Instant HMAC webhook + email parser verification",
      "Full Pro badge & priority queue access",
    ],
  },
  {
    id: "pro_monthly",
    name: "FinFlow Pro Monthly",
    tagline: "5x AI power for daily expense automation",
    priceInr: 99,
    pricePaise: 9900,
    durationDays: 30,
    aiMultiplier: 5,
    unlimitedAi: false,
    badge: "Most Popular",
    features: [
      "5x AI limits (300 NLP parses & 250 Voice / month)",
      "75 AI receipt & bill scans / month",
      "150 AI smart financial insights / month",
      "Automated monthly PDF wealth reports",
      "Priority Telegram & WhatsApp AI bot responses",
    ],
  },
  {
    id: "pro_yearly",
    name: "FinFlow Pro Yearly",
    tagline: "Unlimited AI finance copilot all year round (Save 16%)",
    priceInr: 999,
    pricePaise: 99900,
    durationDays: 365,
    aiMultiplier: 100,
    unlimitedAi: true,
    badge: "Best Value · Save 16%",
    features: [
      "Unlimited AI NLP expense parsing & voice entry",
      "Unlimited AI receipt scanning & OCR extraction",
      "Unlimited AI personalized budget & wealth insights",
      "No daily rate cap on AI features",
      "Automated monthly PDF reports + priority support",
    ],
  },
]

interface UsageStat {
  used: number
  limit: number
  remaining: number
}

interface NoticeBanner {
  type: "success" | "info" | "warning" | "error"
  title: string
  description?: string
}

function StatusPill({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className}`}
    >
      {children}
    </span>
  )
}

export default function SubscriptionPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<PlanId | null>(null)
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>(FALLBACK_PLANS)
  const [subscription, setSubscription] = useState<UserSubscriptionStatus | null>(null)
  const [usage, setUsage] = useState<Record<string, UsageStat> | null>(null)
  const [orders, setOrders] = useState<PaymentOrderRecord[]>([])
  const [sdkUrl, setSdkUrl] = useState<string>("https://pay.sadabmunshi.me/youpi.js")
  const [notice, setNotice] = useState<NoticeBanner | null>(null)

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const raw = await getSubscriptionStatus()
      const payload = raw?.data ? raw.data : raw
      if (payload) {
        if (Array.isArray(payload.plans) && payload.plans.length > 0) {
          setPlans(payload.plans)
        }
        if (payload.subscription) {
          setSubscription(payload.subscription)
        }
        if (payload.usage) {
          setUsage(payload.usage)
        }
        if (Array.isArray(payload.orders)) {
          setOrders(payload.orders)
        }
        if (payload.sdkUrl) {
          setSdkUrl(payload.sdkUrl)
        }
      }
    } catch (err) {
      console.error("[Subscription] Failed to fetch status:", err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleVerifyOrder = useCallback(
    async (orderId: string, paymentId?: string, utr?: string) => {
      setVerifyingOrderId(orderId)
      try {
        const raw = await verifySubscriptionPayment({ orderId, paymentId, utr })
        const payload = raw?.data ? raw.data : raw
        if (payload?.verified) {
          setNotice({
            type: "success",
            title: `Subscription Activated: ${payload.subscription?.planName || "FinFlow Pro"}!`,
            description: "Your AI quotas have been upgraded immediately.",
          })
          await fetchStatus(true)
          return true
        } else {
          setNotice({
            type: "info",
            title: payload?.error || "Payment is still being verified by YOUPI PG.",
            description:
              "Once your bank email alert arrives (~5–15 seconds), your plan will activate automatically.",
          })
          await fetchStatus(true)
          return false
        }
      } catch (err: any) {
        const msg = err?.message || "Payment is still being verified by YOUPI PG."
        const isPendingMsg =
          msg.toLowerCase().includes("not yet completed") ||
          msg.toLowerCase().includes("initiated") ||
          msg.toLowerCase().includes("pending")
        setNotice({
          type: isPendingMsg ? "info" : "error",
          title: msg,
          description: isPendingMsg
            ? "Once your bank email alert arrives (~5–15 seconds), click Verify Status or Refresh Status."
            : undefined,
        })
        await fetchStatus(true)
        return false
      } finally {
        setVerifyingOrderId(null)
      }
    },
    [fetchStatus]
  )

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.id === "free") return
    setProcessingPlan(plan.id)
    setNotice(null)

    try {
      const raw = await createSubscriptionOrder(plan.id)
      const orderData = raw?.data ? raw.data : raw
      if (!orderData?.checkoutUrl && !orderData?.paymentId) {
        setNotice({
          type: "error",
          title: orderData?.error || "Failed to initiate YOUPI PG payment session",
        })
        setProcessingPlan(null)
        return
      }

      const {
        orderId,
        paymentId,
        checkoutUrl,
        amount,
        sdkUrl: orderSdkUrl,
        customer,
      } = orderData

      await openYoupiCheckout({
        sdkUrl: orderSdkUrl || sdkUrl,
        checkoutUrl,
        paymentId,
        orderId,
        amount: amount || plan.priceInr.toFixed(2),
        currency: "INR",
        name: "FinFlow Pro",
        description: `${plan.name} (${plan.durationDays} Days)`,
        customer: {
          name: customer?.name || user?.userName || "FinFlow User",
          email: customer?.email || user?.email || "",
        },
        onSuccess: async (result) => {
          const ok = await handleVerifyOrder(orderId, paymentId, result.utr)
          if (ok) {
            setProcessingPlan(null)
          }
        },
        onFailed: (result) => {
          setNotice({
            type: "error",
            title: `Payment failed: ${result.reason || "Transaction declined"}`,
          })
          setProcessingPlan(null)
          fetchStatus(true)
        },
        onExpired: () => {
          setNotice({
            type: "warning",
            title: "Payment session expired. You can start a new checkout anytime.",
          })
          setProcessingPlan(null)
          fetchStatus(true)
        },
        onSuspicious: () => {
          setNotice({
            type: "warning",
            title: "Payment flagged for manual security review.",
          })
          setProcessingPlan(null)
          fetchStatus(true)
        },
        onCancelled: () => {
          setProcessingPlan(null)
          fetchStatus(true)
        },
        onClose: () => {
          setProcessingPlan(null)
          fetchStatus(true)
        },
      })
    } catch (err: any) {
      setNotice({
        type: "error",
        title: err?.message || "Unable to launch YOUPI PG checkout modal",
      })
      setProcessingPlan(null)
    }
  }

  const activePlanId: PlanId = subscription?.planId || "free"
  const isPaidActive = activePlanId !== "free" && subscription?.status === "active"

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Status / Verification Notice Banner */}
        {notice && (
          <div
            className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-sm shadow-sm ${
              notice.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                : notice.type === "error"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200"
                : notice.type === "warning"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                : "border-indigo-500/40 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {notice.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{notice.title}</p>
                {notice.description && (
                  <p className="text-xs opacity-85 mt-0.5">{notice.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header & Active Plan Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-indigo-950/90 via-slate-900 to-violet-950/90 border border-indigo-500/30 rounded-2xl p-6 text-white shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Powered by Self-Hosted YOUPI PG · Zero-Fee UPI Checkout
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2.5">
              FinFlow Subscription & AI Quotas
              {isPaidActive && (
                <StatusPill className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                  {subscription?.planName} Active
                </StatusPill>
              )}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Upgrade your AI financial copilot limits instantly via UPI QR or UPI Intent. Verified
              automatically in real time by YOUPI PG on{" "}
              <span className="font-mono text-indigo-300">pay.sadabmunshi.me</span>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-4 min-w-[240px]">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Current Plan</p>
              <p className="text-lg font-bold text-white flex items-center gap-1.5">
                {isPaidActive ? (
                  <Crown className="w-4 h-4 text-amber-400" />
                ) : (
                  <Zap className="w-4 h-4 text-indigo-400" />
                )}
                {subscription?.planName || "Free Starter"}
              </p>
              {subscription?.currentPeriodEnd && isPaidActive ? (
                <p className="text-xs text-emerald-300 mt-0.5">
                  Valid until{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">Standard 1x Monthly AI Quota</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStatus()}
              disabled={loading}
              className="border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          </div>
        </div>

        {/* Live AI Usage Quotas */}
        {usage && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    Monthly AI Quota Utilization
                  </CardTitle>
                  <CardDescription>
                    Your active tier multiplier:{" "}
                    <span className="font-semibold text-foreground">
                      {subscription?.unlimitedAi
                        ? "Unlimited AI (Pro Yearly)"
                        : `${subscription?.aiMultiplier || 1}x Standard Quota`}
                    </span>
                  </CardDescription>
                </div>
                {subscription?.lastUtr && (
                  <StatusPill className="border-border font-mono text-xs text-muted-foreground">
                    Last UTR: {subscription.lastUtr}
                  </StatusPill>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    key: "nlp",
                    label: "AI Expense NLP",
                    icon: MessageSquareText,
                    color: "bg-indigo-500",
                    stat: usage.nlp,
                  },
                  {
                    key: "receipt",
                    label: "Receipt Scans (OCR)",
                    icon: Receipt,
                    color: "bg-violet-500",
                    stat: usage.receipt,
                  },
                  {
                    key: "voice",
                    label: "Voice Commands",
                    icon: Mic,
                    color: "bg-emerald-500",
                    stat: usage.voice,
                  },
                  {
                    key: "insights",
                    label: "Smart Insights",
                    icon: Lightbulb,
                    color: "bg-amber-500",
                    stat: usage.insights,
                  },
                ].map(({ key, label, icon: Icon, color, stat }) => {
                  const used = stat?.used ?? 0
                  const limit = stat?.limit ?? 1
                  const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Icon className="w-3.5 h-3.5 text-foreground/80" />
                          {label}
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {subscription?.unlimitedAi ? `${used} / ∞` : `${used} / ${limit}`}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${color}`}
                          style={{ width: subscription?.unlimitedAi ? "8%" : `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Tiers Grid */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Choose Your FinFlow Plan</h2>
              <p className="text-sm text-muted-foreground">
                Use the <strong>₹1 Live Test Pass</strong> to test end-to-end UPI QR / Intent
                payments in production, or unlock full Pro quotas.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              HMAC-SHA256 Signed Webhooks · Instant Activation
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 pt-2">
            {plans.map((plan) => {
              const isCurrent = activePlanId === plan.id && subscription?.status === "active"
              const isTestPlan = plan.id === "test_1inr"
              const isPopular = plan.id === "pro_monthly"
              const isYearly = plan.id === "pro_yearly"
              const isProcessing = processingPlan === plan.id

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col justify-between transition-all duration-200 ${
                    isPopular
                      ? "border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40"
                      : isTestPlan
                      ? "border-emerald-500/60 shadow-md shadow-emerald-500/5"
                      : isYearly
                      ? "border-amber-500/60 shadow-md shadow-amber-500/5"
                      : "border-border/70"
                  }`}
                >
                  {plan.badge && (
                    <div className="-top-3 left-4 absolute">
                      <StatusPill
                        className={`text-[11px] font-semibold px-2.5 py-0.5 shadow-sm border-transparent ${
                          isPopular
                            ? "bg-indigo-600 text-white"
                            : isTestPlan
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        {plan.badge}
                      </StatusPill>
                    </div>
                  )}

                  <CardHeader className="pt-6 pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold flex items-center gap-1.5">
                        {isTestPlan && <FlaskConical className="w-4 h-4 text-emerald-500" />}
                        {isPopular && <Zap className="w-4 h-4 text-indigo-500" />}
                        {isYearly && <Crown className="w-4 h-4 text-amber-500" />}
                        {plan.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs min-h-[32px]">
                      {plan.tagline}
                    </CardDescription>
                    <div className="pt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight">
                        ₹{plan.priceInr}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {plan.id === "free"
                          ? "/ forever"
                          : plan.id === "test_1inr"
                          ? `/ ${plan.durationDays || 1} day${(plan.durationDays || 1) > 1 ? "s" : ""}`
                          : plan.id === "pro_monthly"
                          ? "/ month"
                          : "/ year"}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col justify-between space-y-6">
                    <ul className="space-y-2.5 text-xs">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-foreground/90">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2">
                      {plan.id === "free" ? (
                        <Button
                          variant="outline"
                          disabled
                          className="w-full text-xs font-semibold"
                        >
                          {isCurrent ? "Current Default Plan" : "Included Forever"}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSelectPlan(plan)}
                          disabled={isProcessing || processingPlan !== null}
                          className={`w-full text-xs font-semibold h-10 ${
                            isPopular
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                              : isTestPlan
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-amber-500 hover:bg-amber-600 text-slate-950"
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Opening YOUPI Checkout...
                            </>
                          ) : isCurrent ? (
                            <>
                              Extend {plan.name} (₹{plan.priceInr})
                              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                            </>
                          ) : (
                            <>
                              Pay ₹{plan.priceInr} via UPI
                              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Recent Payment Orders & Verification Table */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Payment History & Order Verification
            </CardTitle>
            <CardDescription>
              Every order is isolated with a unique Order ID and verified via HMAC-SHA256 webhook
              or direct server check against YOUPI PG.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl">
                No subscription payment orders yet. Try the <strong>₹1 Live Test Pass</strong> above
                to see real-time UPI verification in action!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="py-2.5 px-3 font-medium">Order ID</th>
                      <th className="py-2.5 px-3 font-medium">Plan</th>
                      <th className="py-2.5 px-3 font-medium">Amount</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                      <th className="py-2.5 px-3 font-medium">Bank UTR</th>
                      <th className="py-2.5 px-3 font-medium">Created</th>
                      <th className="py-2.5 px-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {orders.map((ord) => {
                      const isPending =
                        ord.status === "INITIATED" || ord.status === "PENDING"
                      return (
                        <tr key={ord.order_id} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3 font-mono font-medium">
                            {ord.order_id}
                          </td>
                          <td className="py-2.5 px-3 capitalize">
                            {ord.plan_id.replace("_", " ")}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">
                            ₹{Number(ord.amount_inr).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusPill
                              className={
                                ord.status === "SUCCESS"
                                  ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                                  : isPending
                                  ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
                                  : "border-rose-500/40 text-rose-500 bg-rose-500/10"
                              }
                            >
                              {ord.status}
                            </StatusPill>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {ord.utr || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {ord.created_at
                              ? new Date(ord.created_at).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isPending && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px]"
                                disabled={verifyingOrderId === ord.order_id}
                                onClick={() =>
                                  handleVerifyOrder(ord.order_id, ord.payment_id)
                                }
                              >
                                {verifyingOrderId === ord.order_id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />
                                    Verify Status
                                  </>
                                )}
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
