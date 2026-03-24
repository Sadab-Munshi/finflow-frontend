'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Bell, Trash2, Loader2 } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { createClient } from '@/lib/supabase/client'
import { getNotificationIcon, timeAgo } from '@/lib/notifications'
import LoadingScreen from '@/components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { Notification } from '@/lib/types'

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [userId, setUserId] = useState<string | null>(null)

  const loadNotifications = useCallback(async (offset = 0, append = false) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    const { data } = await query

    if (data) {
      if (append) {
        setNotifications(prev => [...prev, ...data])
      } else {
        setNotifications(data)
      }
      setHasMore(data.length === PAGE_SIZE)
    }
  }, [router])

  useEffect(() => {
    const load = async () => {
      await loadNotifications(0, false)
      setLoading(false)
    }
    load()
  }, [loadNotifications])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await loadNotifications(notifications.length, true)
    setLoadingMore(false)
  }

  const handleMarkAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const handleMarkAllAsRead = async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Delete this notification?')) return
    // Optimistically remove from UI
    const removed = notifications.find(n => n.id === id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    const res = await fetch('/api/notifications/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    })
    if (!res.ok) {
      // Restore the removed notification on failure
      if (removed) {
        setNotifications(prev => {
          const exists = prev.some(n => n.id === removed.id)
          if (exists) return prev
          return [removed, ...prev].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        })
      }
      toast.error('Failed to delete notification')
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) handleMarkAsRead(notification.id)
    if (notification.link) router.push(notification.link)
  }

  if (loading) return <LoadingScreen />

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All as Read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === 'unread' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Notification list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            filtered.map(notification => (
              <div
                key={notification.id}
                className={`relative w-full text-left bg-white rounded-2xl border p-4 hover:shadow-sm transition-all ${
                  !notification.read ? 'border-teal-200 bg-teal-50/30' : 'border-gray-100'
                }`}
              >
                <button
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left"
                >
                  <div className="flex gap-3 pr-8">
                    <span className="text-xl flex-shrink-0 mt-0.5">
                      {notification.icon || getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                          {timeAgo(notification.created_at)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-600' : 'text-gray-400'}`}>{notification.message}</p>
                      {notification.link && (
                        <p className="text-xs text-teal-600 mt-1.5">Tap to view →</p>
                      )}
                    </div>
                    {!notification.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(notification.id, e)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Load More */}
        {hasMore && filtered.length >= PAGE_SIZE && (
          <div className="flex justify-center pt-2">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
