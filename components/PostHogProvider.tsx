'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    posthog.capture('$pageview', { path: pathname })
  }, [pathname])

  return <>{children}</>
}
