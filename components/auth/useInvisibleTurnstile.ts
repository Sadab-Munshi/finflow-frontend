'use client'

import { useCallback, useRef, useState } from 'react'
import type { TurnstileInstance } from './TurnstileWidget'

/**
 * Turnstile driven by user intent, kept FAST via pre-warming, with a
 * self-healing visible fallback.
 *
 * - `warmUp()` (called on first form focus): starts the silent challenge in
 *   the background, so by the time the user hits submit the token is usually
 *   already in hand → near-instant sign-in/sign-up.
 * - `acquireToken()` (called on submit): returns the cached token, or awaits
 *   the in-flight warm challenge, or starts a fresh one.
 * - Fallback: with Managed site keys, an invisible challenge can't surface a
 *   required interaction. If the silent attempt errors/times out (~4s), the
 *   widget remounts VISIBLE and the *same* pending attempt keeps waiting —
 *   the flow continues automatically once the check is passed.
 */
export function useInvisibleTurnstile() {
  const ref = useRef<TurnstileInstance>(null)
  const pending = useRef<{ resolve: (token: string | null) => void; timers: ReturnType<typeof setTimeout>[] } | null>(null)
  const tokenRef = useRef<string | null>(null)
  const inflight = useRef<Promise<string | null> | null>(null)
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
    pending.current.timers.push(setTimeout(() => finish(null), 120_000))
  }, [finish])

  const startChallenge = useCallback(() => {
    inflight.current = new Promise<string | null>((resolve) => {
      pending.current = { resolve, timers: [] }
      pending.current.timers.push(setTimeout(enterFallback, 4_000))
      try {
        const instance = ref.current as (TurnstileInstance & { execute?: () => void }) | null
        if (instance && typeof instance.execute === 'function') {
          instance.execute()
        } else {
          enterFallback()
        }
      } catch {
        enterFallback()
      }
    }).finally(() => {
      inflight.current = null
    })
    return inflight.current
  }, [enterFallback])

  /** Background warm-up — call on first interaction with the form. */
  const warmUp = useCallback(() => {
    if (tokenRef.current || inflight.current) return
    startChallenge().then((token) => {
      tokenRef.current = token
    })
  }, [startChallenge])

  const acquireToken = useCallback(async () => {
    if (tokenRef.current) {
      const token = tokenRef.current
      tokenRef.current = null
      return token
    }
    if (inflight.current) {
      return await inflight.current
    }
    return await startChallenge()
  }, [startChallenge])

  const reset = useCallback(() => {
    tokenRef.current = null
    try {
      ref.current?.reset()
    } catch {
      /* widget not mounted yet */
    }
  }, [])

  const callbacks = {
    onSuccess: useCallback(
      (token: string) => {
        // A warmed/auto-run challenge may finish outside an active attempt.
        if (pending.current) finish(token)
        else tokenRef.current = token
      },
      [finish]
    ),
    onError: useCallback(() => enterFallback(), [enterFallback]),
    onExpire: useCallback(() => {
      tokenRef.current = null
      enterFallback()
    }, [enterFallback]),
  }

  return { turnstileRef: ref, warmUp, acquireToken, reset, turnstileCallbacks: callbacks, fallbackVisible }
}
