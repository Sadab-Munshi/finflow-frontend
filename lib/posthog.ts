import posthog from 'posthog-js'

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_3yHLN5MPttsJ7vIG8o5byjcjs5yVSwX9uJ5M5pqgSmH', {
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
