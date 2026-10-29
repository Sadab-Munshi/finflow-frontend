'use client'

import React, { useEffect, useRef } from 'react'
import { CheckCircle2, Sparkles, X } from 'lucide-react'

export interface SubscriptionSuccessOverlayProps {
  /** When true the celebration is shown. */
  open: boolean
  /** Human-readable plan name, e.g. "7-Day Trial Pass". */
  planName: string
  /** Optional line of detail, e.g. "Valid until 5 Nov 2026". */
  detail?: string | null
  onDismiss: () => void
  /** Auto-dismiss delay in ms. Pass 0 to require an explicit dismissal. */
  autoDismissMs?: number
}

/**
 * Full-screen celebration shown once a subscription is actually activated.
 * Plays `public/success.webm` (muted, inline, looping) behind a short headline.
 *
 * Accessibility notes:
 * - role="status" + aria-live="polite" so screen readers announce activation.
 * - The video is decorative and muted; if the browser blocks autoplay or the
 *   asset 404s, the static CheckCircle2 fallback still renders.
 * - Escape and the close button both dismiss; focus moves to the dismiss button.
 */
export function SubscriptionSuccessOverlay({
  open,
  planName,
  detail,
  onDismiss,
  autoDismissMs = 4200,
}: SubscriptionSuccessOverlayProps) {
  const dismissRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    dismissRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)

    // Prevent the page behind the overlay from scrolling while it is open.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer =
      autoDismissMs > 0 ? window.setTimeout(() => onDismiss(), autoDismissMs) : null

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (timer) window.clearTimeout(timer)
    }
  }, [open, onDismiss, autoDismissMs])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-success-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onDismiss}
    >
      <div
        role="status"
        aria-live="polite"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl shadow-slate-950/25 p-6 sm:p-7 text-center animate-in zoom-in-95 duration-300"
      >
        <button
          ref={dismissRef}
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute top-3.5 right-3.5 p-2 rounded-full text-[#64748B] hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Celebration animation. Falls back to a static tick if the asset is missing. */}
        <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-emerald-100/70 animate-pulse" aria-hidden="true" />
          <video
            src="/success.webm"
            className="relative w-full h-full object-contain"
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            aria-hidden="true"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald-600" />
          </video>
        </div>

        <h2
          id="subscription-success-title"
          className="mt-3 text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight"
        >
          Subscription Activated
        </h2>

        <p className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          {planName}
        </p>

        {detail ? (
          <p className="mt-3 text-xs sm:text-sm text-[#475569] leading-relaxed">{detail}</p>
        ) : null}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full min-h-[48px] inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0F766E] to-[#059669] hover:from-[#0d6b63] hover:to-[#048a60] text-white text-sm font-extrabold shadow-sm transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F766E]"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export default SubscriptionSuccessOverlay
