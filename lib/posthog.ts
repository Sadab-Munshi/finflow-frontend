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

export { posthog }
