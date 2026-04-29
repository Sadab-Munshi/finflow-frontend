'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { addTransaction } from '@/lib/db'
import { posthog } from '@/lib/posthog'
import { Transaction } from '@/lib/types'
import { useUser } from '@/context/UserContext'
import { budgetAlertCheck } from '@/lib/api-client'

export function useTransaction() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const checkBudgetAlert = async () => {
    try {
      await budgetAlertCheck(currentUser?.userId || '')
    } catch (e) {
      console.error('[checkBudgetAlert] Failed:', e)
    }
  }

  const saveTransaction = (transactions: Array<Omit<Transaction, 'id' | 'created_at'>>) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const toastId = toast.loading('Saving...')
    router.push('/history')

    void (async () => {
      try {
        for (const tx of transactions) {
          const result = await addTransaction(tx)
          if (!result) throw new Error('Save failed')
          posthog.capture('transaction_added', {
            type: tx.type, category: tx.category, amount: tx.amount,
          })
        }
        toast.success('Saved ✅', { id: toastId })
        try { await checkBudgetAlert() } catch (e) { console.error('[checkBudgetAlert]', e) }
      } catch {
        toast.error('Failed, retry?', { id: toastId, duration: 5000 })
      }
    })()
  }

  return { saveTransaction, isSubmitting, currentUser }
}
