/**
 * YOUPI PG Browser Checkout Loader & Resilient Modal Bridge
 *
 * Loads `youpi.js` from `https://pay.sadabmunshi.me/youpi.js` (or configured sdkUrl)
 * and opens the embedded YOUPI PG checkout modal for a server-created session (`checkoutUrl`).
 * Includes a built-in iframe modal fallback speaking the exact `youpi.*` postMessage
 * protocol so checkout works even if a browser extension blocks external script tags.
 */

export interface YoupiPaymentResult {
  status: 'SUCCESS' | 'FAILED' | 'SUSPICIOUS' | 'EXPIRED' | 'CANCELLED'
  order_id: string
  payment_mode?: string
  amount_received?: number
  utr?: string
  reason?: string
  timestamp?: string
  metadata?: Record<string, unknown>
}

export interface OpenYoupiCheckoutOptions {
  sdkUrl?: string
  checkoutUrl: string
  paymentId: string
  orderId: string
  amount: string | number
  currency?: string
  name?: string
  description?: string
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  onSuccess?: (result: YoupiPaymentResult) => void | Promise<void>
  onFailed?: (result: YoupiPaymentResult) => void
  onExpired?: (result: YoupiPaymentResult) => void
  onSuspicious?: (result: YoupiPaymentResult) => void
  onCancelled?: (result: YoupiPaymentResult) => void
  onClose?: () => void
}

declare global {
  interface Window {
    YoupiCheckout?: {
      pay: (options: Record<string, unknown>) => Promise<unknown>
      open: (options: Record<string, unknown>) => unknown
    }
  }
}

const DEFAULT_PORTAL_ORIGIN = 'https://pay.sadabmunshi.me'

function getAllowedPaymentOrigins(): Set<string> {
  const allowed = new Set<string>([DEFAULT_PORTAL_ORIGIN])
  const envOrigin = (process.env.NEXT_PUBLIC_YOUPI_CHECKOUT_URL || '').trim()
  if (envOrigin) {
    try {
      const parsed = new URL(envOrigin)
      if (parsed.protocol === 'https:') {
        allowed.add(parsed.origin)
      }
    } catch {
      // ignore malformed env URL
    }
  }
  return allowed
}

let sdkLoadPromise: Promise<boolean> | null = null

export function resolvePortalOrigin(sdkUrl?: string): string {
  const allowed = getAllowedPaymentOrigins()
  const configured = (
    process.env.NEXT_PUBLIC_YOUPI_CHECKOUT_URL || DEFAULT_PORTAL_ORIGIN
  ).replace(/\/+$/, '')

  if (sdkUrl) {
    try {
      const candidate = new URL(sdkUrl)
      if (candidate.protocol === 'https:' && allowed.has(candidate.origin)) {
        return candidate.origin
      }
    } catch {
      // ignore invalid URL
    }
  }

  try {
    const parsedConfig = new URL(configured)
    if (parsedConfig.protocol === 'https:' && allowed.has(parsedConfig.origin)) {
      return parsedConfig.origin
    }
  } catch {
    // ignore
  }

  return DEFAULT_PORTAL_ORIGIN
}

export function normalizeCheckoutUrl(
  rawCheckoutUrl: string | undefined,
  paymentId: string,
  sdkUrl?: string
): string {
  const portalOrigin = resolvePortalOrigin(sdkUrl)
  const defaultCheckout = `${portalOrigin}/checkout/${encodeURIComponent(paymentId)}`
  if (!rawCheckoutUrl) {
    return defaultCheckout
  }
  if (
    rawCheckoutUrl.includes('localhost') ||
    rawCheckoutUrl.includes('127.0.0.1') ||
    rawCheckoutUrl.includes('gauravtesting.online')
  ) {
    return defaultCheckout
  }

  try {
    const parsed = new URL(rawCheckoutUrl, portalOrigin)
    if (parsed.protocol !== 'https:' || parsed.origin !== portalOrigin) {
      return defaultCheckout
    }
    return parsed.toString()
  } catch {
    return defaultCheckout
  }
}

export function loadYoupiSdk(sdkUrl?: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.YoupiCheckout) return Promise.resolve(true)
  if (sdkLoadPromise) return sdkLoadPromise

  const portalOrigin = resolvePortalOrigin(sdkUrl)
  const resolvedUrl = `${portalOrigin}/youpi.js`

  sdkLoadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="youpi.js"], script[data-youpi-sdk="true"]'
    )
    if (existing) {
      if (window.YoupiCheckout) {
        resolve(true)
        return
      }
      existing.addEventListener('load', () => resolve(Boolean(window.YoupiCheckout)), { once: true })
      existing.addEventListener('error', () => resolve(false), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = resolvedUrl
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-youpi-sdk', 'true')
    script.onload = () => resolve(Boolean(window.YoupiCheckout))
    script.onerror = () => {
      sdkLoadPromise = null
      resolve(false)
    }
    document.head.appendChild(script)
  })

  return sdkLoadPromise
}

function ensureFallbackStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('youpi-checkout-styles')) return
  const styleEl = document.createElement('style')
  styleEl.id = 'youpi-checkout-styles'
  styleEl.textContent = `
    .youpi-checkout-backdrop {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100dvh;
      background: rgba(12, 35, 64, 0.76);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 2147483640;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.25s ease-out;
    }
    .youpi-checkout-backdrop.active { opacity: 1; }
    .youpi-checkout-container {
      position: relative;
      width: 440px;
      max-width: 95vw;
      height: 680px;
      max-height: 92vh;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 25px 65px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .youpi-checkout-iframe {
      width: 100%;
      height: 100%;
      border: none;
      flex: 1;
      background: #ffffff;
    }
    @media (min-width: 768px) {
      .youpi-checkout-container {
        width: 900px;
        max-width: 95vw;
        height: 600px;
        max-height: 92vh;
        border-radius: 16px;
      }
    }
    @media (max-width: 767px) {
      .youpi-checkout-backdrop { align-items: flex-end; }
      .youpi-checkout-container {
        width: 100vw;
        max-width: 100vw;
        height: 90dvh;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
      }
    }
  `
  document.head.appendChild(styleEl)
}

function openFallbackModal(options: OpenYoupiCheckoutOptions) {
  ensureFallbackStyles()

  const normalizedUrl = normalizeCheckoutUrl(options.checkoutUrl, options.paymentId, options.sdkUrl)
  const sep = normalizedUrl.includes('?') ? '&' : '?'
  let targetUrl = `${normalizedUrl}${sep}embedded=1`
  if (options.amount) {
    targetUrl += `&customAmount=${encodeURIComponent(String(options.amount))}`
  }
  if (options.name) {
    targetUrl += `&customName=${encodeURIComponent(options.name)}`
  }

  let iframeOrigin: string | null = null
  try {
    iframeOrigin = new URL(targetUrl, window.location.href).origin
  } catch {
    iframeOrigin = null
  }

  const backdrop = document.createElement('div')
  backdrop.className = 'youpi-checkout-backdrop active'

  const container = document.createElement('div')
  container.className = 'youpi-checkout-container active'

  const iframe = document.createElement('iframe')
  iframe.className = 'youpi-checkout-iframe'
  iframe.src = targetUrl
  iframe.allow = 'payment'

  container.appendChild(iframe)
  backdrop.appendChild(container)
  document.body.appendChild(backdrop)

  let closed = false
  const closeModal = () => {
    if (closed) return
    closed = true
    window.removeEventListener('message', onMessage)
    backdrop.classList.remove('active')
    setTimeout(() => {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop)
      options.onClose?.()
    }, 250)
  }

  const onMessage = (e: MessageEvent) => {
    if (e.source !== iframe.contentWindow) return
    if (iframeOrigin && e.origin !== iframeOrigin) return
    if (!e.data || typeof e.data !== 'object') return

    const ev = e.data.event
    const payload = e.data.data || e.data || {}

    if (ev === 'youpi.payment_success') {
      const result: YoupiPaymentResult = {
        status: 'SUCCESS',
        order_id: payload.orderId || options.orderId,
        payment_mode: payload.method || 'UPI',
        amount_received: Number(payload.amount || options.amount || 0),
        utr: payload.bankRef || payload.utr || payload.reference || '',
        timestamp: payload.completedAt || new Date().toISOString(),
      }
      options.onSuccess?.(result)
      setTimeout(closeModal, 1200)
    } else if (ev === 'youpi.payment_failed') {
      options.onFailed?.({
        status: 'FAILED',
        order_id: payload.orderId || options.orderId,
        reason: payload.reason || payload.status || 'PAYMENT_FAILED',
      })
      closeModal()
    } else if (ev === 'youpi.payment_expired') {
      options.onExpired?.({
        status: 'EXPIRED',
        order_id: payload.orderId || options.orderId,
      })
      closeModal()
    } else if (ev === 'youpi.payment_blocked' || ev === 'youpi.payment_blocked_exit') {
      options.onSuspicious?.({
        status: 'SUSPICIOUS',
        order_id: payload.orderId || options.orderId,
        reason: 'SECURITY_REVIEW_FLAGGED',
      })
      closeModal()
    } else if (
      ev === 'youpi.modal_close' ||
      ev === 'youpi.close' ||
      ev === 'youpi.cancel' ||
      ev === 'youpi.payment_cancelled'
    ) {
      options.onCancelled?.({
        status: 'CANCELLED',
        order_id: options.orderId,
      })
      closeModal()
    }
  }

  window.addEventListener('message', onMessage)
}

export async function openYoupiCheckout(options: OpenYoupiCheckoutOptions): Promise<void> {
  const normalizedCheckoutUrl = normalizeCheckoutUrl(
    options.checkoutUrl,
    options.paymentId,
    options.sdkUrl
  )
  const portalUrl = resolvePortalOrigin(options.sdkUrl)
  const loaded = await loadYoupiSdk(options.sdkUrl)

  if (loaded && typeof window !== 'undefined' && window.YoupiCheckout) {
    await window.YoupiCheckout.pay({
      orderId: options.orderId,
      order_id: options.orderId,
      paymentId: options.paymentId,
      checkoutUrl: normalizedCheckoutUrl,
      portalUrl,
      amount: options.amount,
      currency: options.currency || 'INR',
      name: options.name || 'FinFlow Pro',
      description: options.description || 'FinFlow Subscription',
      customer: options.customer,
      onSuccess: options.onSuccess,
      onFailed: options.onFailed,
      onExpired: options.onExpired,
      onSuspicious: options.onSuspicious,
      onCancelled: options.onCancelled,
      onClose: options.onClose,
    })
    return
  }

  openFallbackModal({
    ...options,
    checkoutUrl: normalizedCheckoutUrl,
  })
}
