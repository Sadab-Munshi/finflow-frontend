'use client'

import { useCallback, useRef } from 'react'
import type { TurnstileInstance } from './TurnstileWidget'

/**
 * Invisible Turnstile driven by user intent: the widget renders nothing, and
 * a token is requested only when the user clicks the primary button
 * (acquireToken() → ref.execute()). Resolves null on any failure/timeout so
 * callers can toast and reset deterministically.
 */
export function useInvisibleTurnstile(timeoutMs = 15000) {
  const ref = useRef<TurnstileInstance>(null)
  const resolverRef = useRef<((token: string | null) => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const settle = useCallback((token: string | null) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    resolverRef.current?.(token)
    resolverRef.current = null
  }, [])

  const acquireToken = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        const instance = ref.current
        if (!instance) {
          resolve(null)
          return
        }
        resolverRef.current = resolve
        timerRef.current = setTimeout(() => settle(null), timeoutMs)
        try {
          instance.execute()
        } catch {
          settle(null)
        }
      }),
    [settle, timeoutMs]
  )

  const reset = useCallback(() => {
    ref.current?.reset()
  }, [])

  const callbacks = {
    onSuccess: useCallback((token: string) => settle(token), [settle]),
    onError: useCallback(() => settle(null), [settle]),
    onExpire: useCallback(() => settle(null), [settle]),
  }

  return { turnstileRef: ref, acquireToken, reset, turnstileCallbacks: callbacks }
}
