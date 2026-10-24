'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import NotificationCenter from './NotificationCenter'
import type { Notification } from '@/lib/types'

const NOTIFICATIONS_LIMIT = 20
const NOTIFICATION_CACHE_TTL_MS = 30_000 // 30 seconds

// Module-level cache so it persists across re-renders
let notificationsCache: { data: Notification[]; timestamp: number } | null = null

function getToastStyle(type: string) {
  switch (type) {
    case 'budget_alert':
      return { icon: '/icons-png/budget-alert.png', style: { background: '#7c2d12', color: '#fed7aa', border: '1px solid rgba(251,146,60,0.3)' } }
    case 'report':
      return { icon: '/icons-png/report.png', style: { background: '#1e3a5f', color: '#bfdbfe', border: '1px solid rgba(96,165,250,0.3)' } }
    case 'transaction':
      return { icon: '✅', style: { background: '#14532d', color: '#bbf7d0', border: '1px solid rgba(74,222,128,0.3)' } }
    default:
      return { icon: '/icons-png/bell.png', style: { background: '#111827', color: '#F9FAFB', border: '1px solid rgba(255,255,255,0.1)' } }
  }
}

export default function NotificationBell() {
  const router = useRouter()
  const t = useTranslations('nav')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  const loadNotifications = useCallback(async (forceRefresh = false) => {
    if (!userId) return

    // Use cached data if fresh enough and not forced
    if (!forceRefresh && notificationsCache && (Date.now() - notificationsCache.timestamp < NOTIFICATION_CACHE_TTL_MS)) {
      setNotifications(notificationsCache.data)
      setUnreadCount(notificationsCache.data.filter((n: Notification) => !n.read).length)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(NOTIFICATIONS_LIMIT)

    if (data) {
      notificationsCache = { data, timestamp: Date.now() }
      setNotifications(data)
      setUnreadCount(data.filter((n: Notification) => !n.read).length)
    }
  }, [userId])

  // Show toasts for unread+unshown notifications on app load, then mark them as shown
  const showUnseenToasts = useCallback(async (uid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .eq('read', false)
      .eq('shown', false)
      .order('created_at', { ascending: false })
      .limit(2)

    if (!data || data.length === 0) return

    // Mark all as shown immediately to avoid re-showing on remount
    const ids = data.map((n: Notification) => n.id)
    await supabase
      .from('notifications')
      .update({ shown: true })
      .in('id', ids)

    // Display a toast for each unseen notification
    data.forEach((n: Notification) => {
      const toastConfig = getToastStyle(n.type)
      toast(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id)
              if (n.link) {
                router.push(n.link)
              }
            }}
            style={{ cursor: n.link ? 'pointer' : 'default' }}
          >
            <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{n.title}</p>
            <p style={{ fontSize: '12px', opacity: 0.85 }}>{n.message}</p>
          </div>
        ),
        {
          duration: 6000,
          icon: toastConfig.icon,
          style: { ...toastConfig.style, borderRadius: '12px' },
        }
      )
    })
  }, [router])

  // Get user and load notifications
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        showUnseenToasts(user.id)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!userId) return
    loadNotifications()
  }, [userId, loadNotifications])

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => {
            const updated = [newNotification, ...prev].slice(0, NOTIFICATIONS_LIMIT)
            // Invalidate cache with new data
            notificationsCache = { data: updated, timestamp: Date.now() }
            return updated
          })
          setUnreadCount(prev => prev + 1)

          // Mark as shown so it doesn't reappear on next app load
          supabase
            .from('notifications')
            .update({ shown: true })
            .eq('id', newNotification.id)
            .then(({ error }) => {
              if (error) console.error('Failed to mark notification as shown:', error)
            })

          // Show toast notification
          const toastConfig = getToastStyle(newNotification.type)
          toast(
            (t) => (
              <div
                onClick={() => {
                  toast.dismiss(t.id)
                  if (newNotification.link) {
                    router.push(newNotification.link)
                  }
                }}
                style={{ cursor: newNotification.link ? 'pointer' : 'default' }}
              >
                <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{newNotification.title}</p>
                <p style={{ fontSize: '12px', opacity: 0.85 }}>{newNotification.message}</p>
              </div>
            ),
            {
              duration: 5000,
              icon: toastConfig.icon,
              style: { ...toastConfig.style, borderRadius: '12px' },
            }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    setNotifications(prev => {
      const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      notificationsCache = { data: updated, timestamp: Date.now() }
      return updated
    })
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleMarkAllAsRead = async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }))
      notificationsCache = { data: updated, timestamp: Date.now() }
      return updated
    })
    setUnreadCount(0)
  }

  return (
    <div ref={bellRef} className="relative">
      {/*
        The trigger uses the same `.ff-icon-btn` surface as the drawer button, so
        the header reads as one symmetric control group. The bell is deliberately
        NOT on a high-contrast primary fill any more: a saturated teal disc at
        the top of every screen competed with the page title and the balance
        card. Attention now lives in the red unread counter alone, which keeps
        its size, position and contrast.
      */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ff-icon-btn relative"
        aria-label={t('notifications')}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationCenter
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
