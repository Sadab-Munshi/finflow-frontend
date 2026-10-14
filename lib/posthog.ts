import posthog from 'posthog-js'

export const initPostHog = () => {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (typeof window !== 'undefined' && posthogKey) {
    posthog.init(posthogKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'cookie',
      cookie_expiration: 365,
    })
  }
  return posthog
}

// Fire-and-forget product events. SSR + init-order safe.
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    posthog.capture(event, props)
  } catch {
    /* analytics must never break the product */
  }
}

// Tie anonymous device history to the account (person_profiles: identified_only).
export function identifyUser(id: string, email?: string) {
  if (typeof window === 'undefined' || !id) return
  try {
    posthog.identify(id, email ? { email } : undefined)
  } catch {
    /* noop */
  }
}

export { posthog }
