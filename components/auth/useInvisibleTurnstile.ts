'use client'

import { useCallback, useRef, useState } from 'react'
import type { TurnstileInstance } from './TurnstileWidget'

/**
 * Turnstile driven by user intent with a self-healing fallback.
 *
 * Phase 1 — invisible: on form submit, `acquireToken()` calls `execute()` and
 * waits for the callback. Works silently for most users.
 *
 * Phase 2 — visible fallback: some site keys (e.g. Managed widgets that
 * decide an interaction is needed) cannot complete while invisible. If the
 * invisible attempt errors/times out, `fallbackVisible` flips true, the
 * widget is remounted in VISIBLE mode (auto-runs), and the SAME pending
 * submit keeps waiting for the user to pass the check — the sign-in/sign-up
 * then continues automatically with zero extra clicks.
 */
export function useInvisibleTurnstile() {
  const ref = useRef<TurnstileInstance>(null)
  const pending = useRef<{ resolve: (token: string | null) => void; timers: ReturnType<typeof setTimeout>[] } | null>(null)
  const [fallbackVisible, setFallbackVisible] = useState(false)

  const finish = useCallback((token: string | null) => {
    if (!pending.current) return
    pending.current.timers.forEach(clearTimeout)
    const resolve = pending.current.resolve
    pending.current = null
    resolve(token)
  }, [])

  const enterFallback = useCallback(() => {
    if (!pending.current) return
    setFallbackVisible(true)
    // The user may need a moment to notice and complete the visible check.
    pending.current.timers.push(setTimeout(() => finish(null), 120_000))
  }, [finish])

  const acquireToken = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        pending.current = { resolve, timers: [] }
        pending.current.timers.push(setTimeout(enterFallback, 10_000))
        try {
          const instance = ref.current as (TurnstileInstance & { execute?: () => void }) | null
          if (instance && typeof instance.execute === 'function') {
            instance.execute()
          } else {
            // No programmatic execution available → straight to the visible widget.
            enterFallback()
          }
        } catch {
          enterFallback()
        }
      }),
    [enterFallback]
  )

  const reset = useCallback(() => {
    try {
      ref.current?.reset()
    } catch {
      /* widget not mounted yet */
    }
  }, [])

  const callbacks = {
    onSuccess: useCallback((token: string) => finish(token), [finish]),
    onError: useCallback(() => enterFallback(), [enterFallback]),
    onExpire: useCallback(() => enterFallback(), [enterFallback]),
  }

  return { turnstileRef: ref, acquireToken, reset, turnstileCallbacks: callbacks, fallbackVisible }
}
