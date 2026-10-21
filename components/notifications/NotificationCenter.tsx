'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, CheckCheck, Bell } from 'lucide-react'
import { getNotificationIcon, timeAgo } from '@/lib/notification-utils'
import type { Notification } from '@/lib/types'

interface NotificationCenterProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onClose: () => void
}

export default function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationCenterProps) {
  const router = useRouter()

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
      onClose()
    }
  }

  return (
    <div className="absolute right-0 top-12 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-400 text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                !notification.read ? 'bg-teal-50/30' : ''
              }`}
            >
              <div className="flex gap-3">
                {(notification.icon || getNotificationIcon(notification.type))?.endsWith('.png') ? (
                  <img
                    src={`/icons-png/${notification.icon || getNotificationIcon(notification.type)}`}
                    alt=""
                    className="w-[28px] h-[28px] object-contain flex-shrink-0"
                  />
                ) : (notification.icon || getNotificationIcon(notification.type)) ? (
                  <span className="text-base leading-none">{notification.icon || getNotificationIcon(notification.type)}</span>
                ) : (
                  <Bell className="w-5 h-5 text-slate-400" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                      {notification.title}
                    </p>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                      {timeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-2" />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All as Read
          </button>
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            View All
          </Link>
        </div>
      )}
    </div>
  )
}
