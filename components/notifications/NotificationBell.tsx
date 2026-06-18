'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import NotificationCenter from './NotificationCenter'
import { getNotifications, markNotificationRead, markAllNotificationsRead, markNotificationsShown } from '@/lib/api-client'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/types'

const NOTIFICATIONS_LIMIT = 20
const NOTIFICATION_CACHE_TTL_MS = 30_000 // 30 seconds
const POLL_INTERVAL_MS = 30_000

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const shownIdsRef = useRef<Set<string>>(new Set())

  const showToast = useCallback((n: Notification) => {
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
  }, [router])

  const loadNotifications = useCallback(async (forceRefresh = false) => {
    if (!userId) return

    // Use cached data if fresh enough and not forced
    if (!forceRefresh && notificationsCache && (Date.now() - notificationsCache.timestamp < NOTIFICATION_CACHE_TTL_MS)) {
      setNotifications(notificationsCache.data)
      setUnreadCount(notificationsCache.data.filter((n: Notification) => !n.read).length)
      return
    }

    try {
      const data = await getNotifications(NOTIFICATIONS_LIMIT)
      const notifs = data.notifications || []
      notificationsCache = { data: notifs, timestamp: Date.now() }
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n: Notification) => !n.read).length)
    } catch (err) {
      console.error('[NotificationBell] Failed to load notifications:', err)
    }
  }, [userId])

  // Show toasts for unread notifications on app load, then mark them as shown
  const showUnseenToasts = useCallback(async () => {
    try {
      const data = await getNotifications(2, true)
      const unseen = (data.notifications || []).filter(
        (n: Notification) => !n.read && !shownIdsRef.current.has(n.id)
      )

      if (unseen.length === 0) return

      // Mark as shown locally to avoid re-showing
      unseen.forEach((n: Notification) => shownIdsRef.current.add(n.id))

      // Mark as read in backend
      const ids = unseen.map((n: Notification) => n.id)
      markNotificationsShown(ids).catch(() => {})

      // Display a toast for each unseen notification
      unseen.forEach((n: Notification) => showToast(n))
    } catch (err) {
      console.error('[NotificationBell] Failed to show unseen toasts:', err)
    }
  }, [showToast])

  // Get user and load notifications
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        showUnseenToasts()
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!userId) return
    loadNotifications()
  }, [userId, loadNotifications])

  // Poll for new notifications instead of Supabase realtime
  useEffect(() => {
    if (!userId) return

    const poll = async () => {
      try {
        const data = await getNotifications(NOTIFICATIONS_LIMIT)
        const notifs = data.notifications || []
        notificationsCache = { data: notifs, timestamp: Date.now() }
        setNotifications(notifs)
        setUnreadCount(notifs.filter((n: Notification) => !n.read).length)

        // Show toasts for new unread notifications
        const newUnread = notifs.filter(
          (n: Notification) => !n.read && !shownIdsRef.current.has(n.id)
        )
        if (newUnread.length > 0) {
          newUnread.forEach((n: Notification) => {
            shownIdsRef.current.add(n.id)
            showToast(n)
          })
          const ids = newUnread.map((n: Notification) => n.id)
          markNotificationsShown(ids).catch(() => {})
        }
      } catch {
        // poll failed, will retry next interval
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [userId, showToast])

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
    try {
      await markNotificationRead(notificationId)
    } catch {
      // ignore
    }

    setNotifications(prev => {
      const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      notificationsCache = { data: updated, timestamp: Date.now() }
      return updated
    })
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleMarkAllAsRead = async () => {
    if (!userId) return
    try {
      await markAllNotificationsRead()
    } catch {
      // ignore
    }

    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }))
      notificationsCache = { data: updated, timestamp: Date.now() }
      return updated
    })
    setUnreadCount(0)
  }

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
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
