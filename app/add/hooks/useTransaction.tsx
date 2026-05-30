'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { addTransaction } from '@/lib/db'
import { posthog } from '@/lib/posthog'
import { Transaction } from '@/lib/types'
import { useUser } from '@/context/UserContext'
import { budgetAlertCheck } from '@/lib/api-client'
import { enqueueTransaction, dequeueAll, removeItem } from '@/lib/offlineQueue'

export function useTransaction() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const checkBudgetAlert = useCallback(async () => {
    try {
      await budgetAlertCheck(currentUser?.userId || '')
    } catch (e) {
      console.error('[checkBudgetAlert] Failed:', e)
    }
  }, [currentUser?.userId])

  const syncPendingTransactions = useCallback(async () => {
    if (typeof window === 'undefined') return

    let pending
    try {
      pending = await dequeueAll()
    } catch {
      return
    }
    if (!pending || pending.length === 0) return

    const toastId = toast.loading(`Syncing ${pending.length} pending transaction(s)...`)
    let synced = 0

    for (const item of pending) {
      const { queuedAt, ...tx } = item
      try {
        const result = await addTransaction(tx as Omit<Transaction, 'id' | 'created_at'>)
        if (!result) throw new Error('Sync insert failed')
        await removeItem(queuedAt)
        synced++
      } catch {
        // Leave failed item in queue; continue with rest
      }
    }

    if (synced > 0) {
      toast.success(`Back online! ${synced} pending transaction(s) synced successfully.`, { id: toastId })
      try { await checkBudgetAlert() } catch (e) { console.error('[checkBudgetAlert]', e) }
    } else {
      toast.error('Sync failed. Will retry when online.', { id: toastId })
    }
  }, [checkBudgetAlert])

  // Global online/offline toasts + sync on reconnect
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOffline = () => {
      toast("You're offline. New transactions will be saved locally.", {
        icon: '⚠️',
        style: { background: '#fef3c7', color: '#92400e' },
        duration: 4000,
      })
    }

    const handleOnline = () => {
      toast.success("You're back online!")
      // Sync queued transactions after a short delay so the success toast appears first
      setTimeout(() => {
        syncPendingTransactions().catch(() => {})
      }, 500)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [syncPendingTransactions])

  const saveTransaction = (transactions: Array<Omit<Transaction, 'id' | 'created_at'>>) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const isOffline = typeof window !== 'undefined' && !navigator.onLine

    if (isOffline) {
      // OFFLINE PATH: enqueue to IndexedDB
      void (async () => {
        const toastId = toast.loading('Saving locally...')
        try {
          for (const tx of transactions) {
            await enqueueTransaction(tx)
          }
          toast("You're offline. Transaction saved locally and will sync when you're back online.", {
            id: toastId,
            icon: '💾',
            style: { background: '#fef3c7', color: '#92400e' },
            duration: 4000,
          })
          router.push('/history')
        } catch {
          toast.error('Failed to save locally.', { id: toastId })
        } finally {
          setIsSubmitting(false)
        }
      })()
      return
    }

    // ONLINE PATH: existing Supabase insert flow
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
        toast.success('Saved', { id: toastId })
        try { await checkBudgetAlert() } catch (e) { console.error('[checkBudgetAlert]', e) }
      } catch {
        toast.error('Failed, retry?', { id: toastId, duration: 5000 })
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  return { saveTransaction, isSubmitting, currentUser }
}
