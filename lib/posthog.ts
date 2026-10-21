import type { PostHog } from 'posthog-js'

let posthogInstance: PostHog | null = null
let loadPromise: Promise<PostHog | null> | null = null
let initialized = false

async function loadPostHogClient(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return null
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!posthogKey) return null

  if (posthogInstance) return posthogInstance
  if (loadPromise) return loadPromise

  loadPromise = import('posthog-js')
    .then((mod) => {
      const client = mod.default
      if (!initialized) {
        initialized = true
        client.init(posthogKey, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: true,
          capture_pageleave: true,
          persistence: 'cookie',
          cookie_expiration: 365,
        })
      }
      posthogInstance = client
      return client
    })
    .catch(() => null)

  return loadPromise
}

export const initPostHog = () => {
  if (typeof window === 'undefined') return posthog
  const schedule =
    typeof window.requestIdleCallback === 'function'
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2500 })
      : (cb: () => void) => window.setTimeout(cb, 1200)

  schedule(() => {
    void loadPostHogClient()
  })
  return posthog
}

// Fire-and-forget product events. SSR + init-order safe.
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  void loadPostHogClient().then((client) => {
    try {
      client?.capture(event, props)
    } catch {
      /* analytics must never break the product */
    }
  })
}

// Tie anonymous device history to the account (person_profiles: identified_only).
export function identifyUser(
  id: string,
  email?: string,
  extra?: Record<string, unknown>
) {
  if (typeof window === 'undefined' || !id) return
  void loadPostHogClient().then((client) => {
    try {
      const traits = { ...(email ? { email } : {}), ...(extra || {}) }
      client?.identify(id, Object.keys(traits).length > 0 ? traits : undefined)
    } catch {
      /* noop */
    }
  })
}

export function resetAnalytics() {
  if (typeof window === 'undefined') return
  if (posthogInstance) {
    try {
      posthogInstance.reset()
    } catch {
      /* noop */
    }
  }
}

// Compatible proxy for callers using `posthog.capture`, `posthog.identify`, `posthog.opt_in_capturing`, etc.
export const posthog = {
  capture(event: string, props?: Record<string, unknown>) {
    track(event, props)
  },
  identify(id: string, traits?: Record<string, unknown>) {
    if (typeof window === 'undefined' || !id) return
    void loadPostHogClient().then((client) => {
      try {
        client?.identify(id, traits)
      } catch {
        /* noop */
      }
    })
  },
  reset() {
    resetAnalytics()
  },
  opt_in_capturing() {
    if (typeof window === 'undefined') return
    void loadPostHogClient().then((client) => {
      try {
        client?.opt_in_capturing()
      } catch {
        /* noop */
      }
    })
  },
  opt_out_capturing() {
    if (typeof window === 'undefined') return
    void loadPostHogClient().then((client) => {
      try {
        client?.opt_out_capturing()
      } catch {
        /* noop */
      }
    })
  },
}
