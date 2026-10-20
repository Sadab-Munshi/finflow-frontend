import type {
  PlanId,
  SubscriptionPlan,
  PaymentOrderRecord,
} from './api-client'

export type { PlanId, SubscriptionPlan, PaymentOrderRecord }

export type CanonicalPaymentStatus =
  | 'paid'
  | 'pending'
  | 'failed'
  | 'expired'
  | 'refunded'

export type NormalizedPaymentStatusKey =
  | 'paid'
  | 'failed'
  | 'pending'
  | 'processing'
  | 'expired'
  | 'refunded'
  | 'unavailable'

export interface NormalizedPaymentStatus {
  key: NormalizedPaymentStatusKey
  status: CanonicalPaymentStatus
  raw: string
  label: string
  actionLabel: string
  description: string
  canVerify: boolean
  canRetry: boolean
  isPaid: boolean
}

export type QuotaMetricKey = 'nlp' | 'receipt' | 'voice' | 'insights'

export interface QuotaSingleStat {
  used?: number
  limit?: number
  remaining?: number
}

export interface AiQuotasPayload {
  nlp?: QuotaSingleStat
  receipt?: QuotaSingleStat
  voice?: QuotaSingleStat
  insights?: QuotaSingleStat
  [key: string]: QuotaSingleStat | undefined
}

export interface UserSubscriptionState {
  userId: string
  planId: PlanId
  planName: string
  status: 'active' | 'expired' | 'free' | 'cancelled'
  aiMultiplier: number
  unlimitedAi: boolean
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  lastPaymentId?: string | null
  lastOrderId?: string | null
  lastUtr?: string | null
}

export interface FormattedQuotaMetric {
  key: QuotaMetricKey
  label: string
  description: string
  helperText: string
  used: number
  limit: number
  remaining: number
  percentage: number
  percentUsed: number
  tone: 'normal' | 'warning' | 'danger'
  isHighCapacity: boolean
  isAtLimit: boolean
  isNearLimit: boolean
  usageText: string
  remainingText: string
  summaryText: string
}

export interface CustomerFacingPlan extends SubscriptionPlan {
  intervalLabel: string
  cadenceLabel: string
  billingNote: string
  allowances: {
    nlp: string
    voice: string
    receipt: string
    insights: string
    reports: string
  }
}

export const CUSTOMER_PLAN_OVERRIDES: Record<
  PlanId,
  {
    name: string
    publicBadge?: string
    cadenceLabel: string
    billingNote: string
    tagline: string
    features: string[]
    allowances: {
      nlp: string
      voice: string
      receipt: string
      insights: string
      reports: string
    }
  }
> = {
  free: {
    name: 'Free Starter',
    cadenceLabel: 'Forever',
    billingNote: 'Included with your FinFlow account',
    tagline: 'Essential expense tracking and monthly AI assistance for everyday budgeting.',
    features: [
      '60 Smart Entries per month',
      '50 Voice Entries per month',
      '30 Receipt Scans per month',
      '10 Spending Insights & monthly Financial Report',
    ],
    allowances: {
      nlp: '60 / month',
      voice: '50 / month',
      receipt: '30 / month',
      insights: '10 / month',
      reports: 'Standard monthly PDF',
    },
  },
  test_1inr: {
    name: '7-Day Trial Pass',
    publicBadge: '7-Day Pass',
    cadenceLabel: 'for 7 days',
    billingNote: 'One-time ₹1 pass · Valid for 7 days · Does not auto-renew',
    tagline: '7-day prepaid pass with double monthly AI allowances.',
    features: [
      '120 Smart Entries & 100 Voice Entries per month',
      '60 Receipt Scans & 20 Spending Insights per month',
      'Instant UPI payment confirmation & digital receipt',
      'Valid for 7 days with no automatic renewal',
    ],
    allowances: {
      nlp: '120 / month',
      voice: '100 / month',
      receipt: '60 / month',
      insights: '20 / month',
      reports: 'Standard monthly PDF',
    },
  },
  pro_monthly: {
    name: 'Pro Monthly',
    publicBadge: 'Most Popular',
    cadenceLabel: 'for 30 days',
    billingNote: 'One-time UPI payment for 30 days · Does not auto-renew',
    tagline: '5× monthly AI allowances for daily voice entry, receipt scanning, and deeper insights.',
    features: [
      '300 Smart Entries & 250 Voice Entries per month',
      '150 Receipt Scans & 50 Spending Insights per month',
      'Cash-flow forecasting & Unusual Spending Alerts',
      'Priority monthly Financial Reports & bot sync',
    ],
    allowances: {
      nlp: '300 / month',
      voice: '250 / month',
      receipt: '150 / month',
      insights: '50 / month',
      reports: 'Priority monthly PDF',
    },
  },
  pro_yearly: {
    name: 'Pro Yearly',
    publicBadge: 'Best Value · Save 16%',
    cadenceLabel: 'for 365 days',
    billingNote: 'One-time UPI payment for 365 days · Save ₹189 vs monthly · Does not auto-renew',
    tagline: 'Full-year high-capacity access with no daily AI rate cap and maximum monthly allowances.',
    features: [
      'Up to 9,999 Smart, Voice & Receipt entries per month',
      'Up to 9,999 on-demand Spending Insights per month',
      'No daily rate limit across AI features',
      'Year-over-year comparisons, Financial Reports & priority support',
    ],
    allowances: {
      nlp: '9,999 / month (No daily cap)',
      voice: '9,999 / month (No daily cap)',
      receipt: '9,999 / month (No daily cap)',
      insights: '9,999 / month (No daily cap)',
      reports: 'Priority monthly + YoY analytics',
    },
  },
}

/**
 * Formats an INR amount safely using Indian locale formatting.
 */
export function formatInrCurrency(
  amountInr: number | string | null | undefined,
  options?: {
    showDecimals?: boolean
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
): string {
  const num = typeof amountInr === 'string' ? Number(amountInr) : amountInr
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return '₹0'
  }
  const hasDecimals = Math.round(num * 100) % 100 !== 0
  const minDigits =
    options?.minimumFractionDigits ??
    (options?.showDecimals ? 2 : hasDecimals ? 2 : 0)
  const maxDigits = options?.maximumFractionDigits ?? 2

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(num)
}

/**
 * Formats a date or timestamp in Indian English locale.
 */
export function formatLocalizedDate(
  dateInput: string | Date | null | undefined,
  options?: { includeTime?: boolean }
): string {
  if (!dateInput) return '—'
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return '—'

  if (options?.includeTime) {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/**
 * Formats a date and time in Indian English locale.
 */
export function formatLocalizedDateTime(
  dateInput: string | Date | null | undefined
): string {
  return formatLocalizedDate(dateInput, { includeTime: true })
}

/**
 * Computes whole days remaining until a period end timestamp.
 */
export function getDaysRemaining(
  periodEndInput: string | Date | null | undefined,
  nowInput: Date = new Date()
): number | null {
  if (!periodEndInput) return null
  const end =
    periodEndInput instanceof Date ? periodEndInput : new Date(periodEndInput)
  if (Number.isNaN(end.getTime())) return null
  const diffMs = end.getTime() - nowInput.getTime()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

/**
 * Computes the next monthly AI quota reset date (1st of next month).
 */
export function getNextMonthlyResetDate(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const nextMonthFirst = new Date(year, month + 1, 1)
  return formatLocalizedDate(nextMonthFirst)
}

/**
 * Maps raw backend payment order status into customer-friendly status metadata.
 * Never maps a status to Paid unless the server explicitly returned SUCCESS or PAID.
 */
export function normalizePaymentStatus(
  rawStatus: string | null | undefined
): NormalizedPaymentStatus {
  const raw = (rawStatus || '').trim().toUpperCase()

  switch (raw) {
    case 'SUCCESS':
    case 'PAID':
      return {
        key: 'paid',
        status: 'paid',
        raw: raw || 'SUCCESS',
        label: 'Paid',
        actionLabel: 'View receipt',
        description: 'Payment confirmed and pass access activated.',
        canVerify: false,
        canRetry: false,
        isPaid: true,
      }
    case 'PROCESSING':
      return {
        key: 'processing',
        status: 'pending',
        raw,
        label: 'Pending',
        actionLabel: 'Check payment',
        description: 'Confirming your payment with your bank. Please check again shortly.',
        canVerify: true,
        canRetry: false,
        isPaid: false,
      }
    case 'INITIATED':
    case 'PENDING':
    case 'ACTIVE':
    case 'QUEUED':
      return {
        key: 'pending',
        status: 'pending',
        raw,
        label: 'Pending',
        actionLabel: 'Check payment',
        description: 'Awaiting UPI payment confirmation. If you already paid, tap Check Status.',
        canVerify: true,
        canRetry: true,
        isPaid: false,
      }
    case 'FAILED':
    case 'CANCELLED':
    case 'SUSPICIOUS':
      return {
        key: 'failed',
        status: 'failed',
        raw,
        label: 'Failed',
        actionLabel: 'Try again',
        description: 'This payment did not complete. No charge was applied to your pass.',
        canVerify: false,
        canRetry: true,
        isPaid: false,
      }
    case 'EXPIRED':
      return {
        key: 'expired',
        status: 'expired',
        raw,
        label: 'Expired',
        actionLabel: 'Make new payment',
        description: 'This payment session expired before completion.',
        canVerify: true,
        canRetry: true,
        isPaid: false,
      }
    case 'REFUNDED':
      return {
        key: 'refunded',
        status: 'refunded',
        raw,
        label: 'Refunded',
        actionLabel: 'View refund details',
        description: 'This payment was refunded.',
        canVerify: false,
        canRetry: false,
        isPaid: false,
      }
    default:
      return {
        key: 'unavailable',
        status: 'pending',
        raw: raw || 'UNKNOWN',
        label: 'Pending',
        actionLabel: 'View details',
        description: 'Current payment status is being updated.',
        canVerify: true,
        canRetry: false,
        isPaid: false,
      }
  }
}

/**
 * Formats a plan ID into a customer-friendly display name.
 */
export function getCustomerPlanName(
  planId: string | null | undefined,
  options?: { isTestAccount?: boolean }
): string {
  if (!planId) return 'Free Starter'
  if (planId === 'test_1inr') {
    return options?.isTestAccount ? '7-Day Trial Pass (₹1)' : '7-Day Trial Pass'
  }
  if (planId in CUSTOMER_PLAN_OVERRIDES) {
    return CUSTOMER_PLAN_OVERRIDES[planId as PlanId].name
  }
  return planId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getPlanDisplayName(
  planId: string | null | undefined,
  fallbackName?: string | null
): string {
  if (planId && planId in CUSTOMER_PLAN_OVERRIDES) {
    return CUSTOMER_PLAN_OVERRIDES[planId as PlanId].name
  }
  if (fallbackName && !fallbackName.toLowerCase().includes('youpi')) {
    return fallbackName
  }
  return getCustomerPlanName(planId)
}

/**
 * Normalizes a single AI quota metric for customer display.
 */
export function formatQuotaMetric(
  key: QuotaMetricKey,
  rawStat: QuotaSingleStat | null | undefined
): FormattedQuotaMetric {
  const meta: Record<
    QuotaMetricKey,
    { label: string; helperText: string; defaultLimit: number }
  > = {
    nlp: {
      label: 'Smart Entries',
      helperText: 'Type expenses naturally in plain text',
      defaultLimit: 60,
    },
    receipt: {
      label: 'Receipt Scans',
      helperText: 'Extract totals & items from bill photos',
      defaultLimit: 30,
    },
    voice: {
      label: 'Voice Entries',
      helperText: 'Log expenses hands-free by speaking',
      defaultLimit: 50,
    },
    insights: {
      label: 'Spending Insights',
      helperText: 'Personalized budget & saving analysis',
      defaultLimit: 10,
    },
  }

  const info = meta[key]
  const rawUsed = Number(rawStat?.used)
  const rawLimit = Number(rawStat?.limit)
  const used = Number.isFinite(rawUsed) && rawUsed >= 0 ? Math.floor(rawUsed) : 0
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : info.defaultLimit
  const remaining = Math.max(0, limit - used)
  const isHighCapacity = limit >= 9000
  const rawPct = limit > 0 ? (used / limit) * 100 : 0
  const percentUsed = Math.min(100, Math.max(0, Math.round(rawPct)))
  const isAtLimit = remaining === 0 && limit > 0
  const isNearLimit = !isAtLimit && percentUsed >= 70

  const tone: 'normal' | 'warning' | 'danger' =
    percentUsed >= 90 || isAtLimit
      ? 'danger'
      : percentUsed >= 70
      ? 'warning'
      : 'normal'

  const usageText = `${used.toLocaleString('en-IN')} / ${limit.toLocaleString('en-IN')}`
  const remainingText = `${remaining.toLocaleString('en-IN')} left`
  const summaryText = `${remaining.toLocaleString('en-IN')} remaining · ${used.toLocaleString('en-IN')} of ${limit.toLocaleString('en-IN')} used`

  return {
    key,
    label: info.label,
    description: info.helperText,
    helperText: info.helperText,
    used,
    limit,
    remaining,
    percentage: percentUsed,
    percentUsed,
    tone,
    isHighCapacity,
    isAtLimit,
    isNearLimit,
    usageText,
    remainingText,
    summaryText,
  }
}

/**
 * Returns all 4 normalized AI usage metrics in display order.
 */
export function getNormalizedUsageMetrics(
  quotas: AiQuotasPayload | null | undefined,
  unlimitedAi = false
): FormattedQuotaMetric[] {
  const keys: QuotaMetricKey[] = ['nlp', 'receipt', 'voice', 'insights']
  return keys.map((key) => {
    const stat = quotas?.[key]
    if (unlimitedAi && (!stat?.limit || stat.limit < 9999)) {
      return formatQuotaMetric(key, {
        used: stat?.used ?? 0,
        limit: 9999,
      })
    }
    return formatQuotaMetric(key, stat)
  })
}

/**
 * Returns customer-facing plans merged with authoritative pricing/duration from the API,
 * hiding the ₹1 test pass unless `showTestPlan` is explicitly true.
 */
export function getCustomerFacingPlans(
  apiPlans: SubscriptionPlan[] | undefined | null,
  options?: { showTestPlan?: boolean }
): CustomerFacingPlan[] {
  const baseOrder: PlanId[] = options?.showTestPlan
    ? ['free', 'pro_monthly', 'pro_yearly', 'test_1inr']
    : ['free', 'pro_monthly', 'pro_yearly']

  const apiById = new Map<string, SubscriptionPlan>()
  if (Array.isArray(apiPlans)) {
    for (const p of apiPlans) {
      if (p?.id) apiById.set(p.id, p)
    }
  }

  const defaultPrices: Record<
    PlanId,
    {
      priceInr: number
      durationDays: number
      aiMultiplier: number
      unlimitedAi: boolean
    }
  > = {
    free: { priceInr: 0, durationDays: 0, aiMultiplier: 1, unlimitedAi: false },
    test_1inr: { priceInr: 1, durationDays: 7, aiMultiplier: 2, unlimitedAi: false },
    pro_monthly: { priceInr: 99, durationDays: 30, aiMultiplier: 5, unlimitedAi: false },
    pro_yearly: { priceInr: 999, durationDays: 365, aiMultiplier: 999, unlimitedAi: true },
  }

  return baseOrder.map((planId) => {
    const fromApi = apiById.get(planId)
    const override = CUSTOMER_PLAN_OVERRIDES[planId]
    const fallback = defaultPrices[planId]
    const priceInr = fromApi?.priceInr ?? fallback.priceInr
    const durationDays = fromApi?.durationDays ?? fallback.durationDays
    const cadenceLabel =
      planId === 'test_1inr' && durationDays > 0
        ? `for ${durationDays} day${durationDays > 1 ? 's' : ''}`
        : override.cadenceLabel

    return {
      id: planId,
      name: override.name,
      tagline: override.tagline,
      priceInr,
      pricePaise: fromApi?.pricePaise ?? Math.round(priceInr * 100),
      durationDays,
      aiMultiplier: fromApi?.aiMultiplier ?? fallback.aiMultiplier,
      unlimitedAi: fromApi?.unlimitedAi ?? fallback.unlimitedAi,
      badge: override.publicBadge,
      features: override.features,
      intervalLabel: cadenceLabel,
      cadenceLabel,
      billingNote: override.billingNote,
      allowances: override.allowances,
    }
  })
}
