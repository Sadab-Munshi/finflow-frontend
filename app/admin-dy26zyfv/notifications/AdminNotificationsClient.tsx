'use client'

import { useState, useEffect } from 'react'
import { Send, ArrowLeft, Users, Bell, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function AdminNotificationsClient() {
  // Form state
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all')
  const [notificationType, setNotificationType] = useState('system')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sendPush, setSendPush] = useState(false)
  const [sendInApp, setSendInApp] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ success: boolean; recipients?: number; inAppSent?: number; pushSent?: number; pushFailed?: number; error?: string } | null>(null)

  // User list for specific targeting
  const [users, setUsers] = useState<{ id: string; email: string; name?: string }[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  useEffect(() => {
    const loadUsers = async () => {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.users) {
        setUsers(data.users.map((u: { id: string; email: string; name?: string }) => ({
          id: u.id,
          email: u.email,
          name: u.name
        })))
      }
    }
    loadUsers()
  }, [])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required')
      return
    }

    setSending(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: notificationType,
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || undefined,
          sendPush,
          sendInApp,
          targetType,
          userIds: targetType === 'specific' ? selectedUserIds : undefined,
        })
      })

      const data = await res.json()
      if (data.success) {
        setResult(data)
        setTitle('')
        setMessage('')
        setLink('')
      } else {
        setError(data.error || 'Failed to send')
      }
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin-dy26zyfv" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Send Notification</h1>
        </div>

        {/* Success result */}
        {result?.success && (
          <div className="bg-green-900/50 border border-green-700 rounded-2xl p-4 mb-6">
            <p className="text-green-300 font-medium">✅ Notification sent successfully!</p>
            <p className="text-green-400/70 text-sm mt-1">
              Recipients: {result.recipients} • In-App: {result.inAppSent} • Push: {result.pushSent}
              {result.pushFailed ? ` • Failed: ${result.pushFailed}` : ''}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-2xl p-4 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Target */}
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4" /> Send To
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setTargetType('all')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  targetType === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                All Users ({users.length})
              </button>
              <button
                onClick={() => setTargetType('specific')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  targetType === 'specific' ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                Specific Users
              </button>
            </div>

            {targetType === 'specific' && (
              <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="w-4 h-4 accent-teal-600"
                    />
                    <span className="text-sm text-gray-300">{user.name || user.email}</span>
                  </label>
                ))}
                {selectedUserIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">{selectedUserIds.length} user(s) selected</p>
                )}
              </div>
            )}
          </div>

          {/* Notification content */}
          <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notification Content
            </h2>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Type</label>
              <select
                value={notificationType}
                onChange={e => setNotificationType(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none"
              >
                <option value="system">System</option>
                <option value="budget_alert">Budget Alert</option>
                <option value="report">Report</option>
                <option value="transaction">Transaction</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g., New Feature Available!"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Message</label>
              <textarea
                placeholder="e.g., We've added dark mode support..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Link (optional)</label>
              <input
                type="text"
                placeholder="e.g., /settings"
                value={link}
                onChange={e => setLink(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          {/* Delivery method */}
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Send As
            </h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendInApp}
                onChange={e => setSendInApp(e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm text-gray-300">In-App Notification</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendPush}
                onChange={e => setSendPush(e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm text-gray-300">Browser Push Notification</span>
            </label>
          </div>

          {/* Preview */}
          {(title || message) && (
            <div className="bg-gray-900 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Preview</h2>
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-sm font-semibold text-white">🔔 {title || 'Notification Title'}</p>
                <p className="text-xs text-gray-400 mt-1">{message || 'Notification message...'}</p>
                {link && <p className="text-xs text-teal-400 mt-2">→ {link}</p>}
              </div>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4" /> Send Now</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
