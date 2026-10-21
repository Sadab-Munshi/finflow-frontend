'use client'

import { useSubscriptionGateContext } from '@/context/SubscriptionGateContext'

export function useSubscriptionGate() {
  return useSubscriptionGateContext()
}
