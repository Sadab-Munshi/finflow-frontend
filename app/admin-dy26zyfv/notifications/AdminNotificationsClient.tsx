'use client'

import { useState, useEffect } from 'react'
import { Send, ArrowLeft, Users, Bell, Smartphone, Mail, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { adminGetUsers, adminSendNotification } from '@/lib/api-client'

export default function AdminNotificationsClient() {
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all')
  const [notificationType, setNotificationType] = useState('system')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sendPush, setSendPush] = useState(false)
  const [sendInApp, setSendInApp] = useState(true)
  const [sendEmail, setSendEmail] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ success: boolean; recipients?: number; inAppSent?: number; pushSent?: number; pushFailed?: number; emailSent?: number; emailFailed?: number; error?: string } | null>(null)

  const [users, setUsers] = useState<{ id: string; email: string; name?: string }[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  useEffect(() => {
    const loadUsers = async () => {
      const data = await adminGetUsers()
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
      const data = await adminSendNotification({
        type: notificationType,
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || undefined,
        sendPush,
        sendInApp,
        sendEmail,
        targetType: targetType as 'all' | 'specific',
        userIds: targetType === 'specific' ? selectedUserIds : undefined,
      })
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
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin-dy26zyfv" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Send Notification</h1>
        </div>

        {/* Success */}
        {result?.success && (
          <div className="bg-green-950 border border-green-800 rounded-xl p-3 mb-5">
            <p className="text-green-300 text-sm font-medium">Notification sent successfully</p>
            <p className="text-green-400/60 text-xs mt-0.5">
              {result.recipients} recipients &middot; In-App: {result.inAppSent} &middot; Push: {result.pushSent}
              {result.pushFailed ? ` &middot; Push Failed: ${result.pushFailed}` : ''}
              {result.emailSent != null && result.emailSent > 0 ? ` &middot; Email: ${result.emailSent}` : ''}
              {result.emailFailed ? ` &middot; Email Failed: ${result.emailFailed}` : ''}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-3 mb-5">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Send To */}
        <section className="mb-5">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Send To
          </h2>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setTargetType('all')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                targetType === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-[#0f1117] text-gray-400 border border-gray-800 hover:border-gray-700'
              }`}
            >
              All Users ({users.length})
            </button>
            <button
              onClick={() => setTargetType('specific')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                targetType === 'specific'
                  ? 'bg-teal-600 text-white'
                  : 'bg-[#0f1117] text-gray-400 border border-gray-800 hover:border-gray-700'
              }`}
            >
              Specific Users
            </button>
          </div>

          {targetType === 'specific' && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-800 divide-y divide-gray-800/50">
              {users.map(user => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-teal-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                    {(user.name || user.email)?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{user.name || user.email}</p>
                    {user.name && <p className="text-[11px] text-gray-500 truncate">{user.email}</p>}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-4 h-4 accent-teal-600 shrink-0"
                  />
                </label>
              ))}
              {selectedUserIds.length > 0 && (
                <div className="px-3 py-2 bg-teal-950/30">
                  <p className="text-[11px] text-teal-400">{selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected</p>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="border-t border-gray-800/60 my-5" />

        {/* Notification Content */}
        <section className="mb-5">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Content
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Type</label>
              <select
                value={notificationType}
                onChange={e => setNotificationType(e.target.value)}
                className="w-full bg-[#0f1117] text-white border border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition-colors"
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
                className="w-full bg-[#0f1117] text-white border border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Message</label>
              <textarea
                placeholder="e.g., We've added dark mode support..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-[#0f1117] text-white border border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition-colors resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Link <span className="text-gray-600">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g., /settings"
                value={link}
                onChange={e => setLink(e.target.value)}
                className="w-full bg-[#0f1117] text-white border border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>
        </section>

        <div className="border-t border-gray-800/60 my-5" />

        {/* Send As */}
        <section className="mb-5">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
            Delivery
          </h2>
          <div className="space-y-0.5">
            {/* In-App */}
            <div className="flex items-center justify-between py-3 px-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-200">In-App Notification</p>
                  <p className="text-[11px] text-gray-500">Shows in notification center</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSendInApp(!sendInApp)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  sendInApp ? 'bg-teal-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    sendInApp ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Push */}
            <div className="flex items-center justify-between py-3 px-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-200">Browser Push</p>
                  <p className="text-[11px] text-gray-500">Sends push to subscribed devices</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSendPush(!sendPush)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  sendPush ? 'bg-teal-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    sendPush ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-3 px-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-200">Email</p>
                  <p className="text-[11px] text-gray-500">Sends to user&apos;s registered email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSendEmail(!sendEmail)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  sendEmail ? 'bg-teal-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    sendEmail ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <div className="border-t border-gray-800/60 my-5" />

        {/* Preview */}
        {(title || message) && (
          <section className="mb-5">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
              Preview
            </h2>
            <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{title || 'Notification Title'}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{message || 'Notification message...'}</p>
                  {link && <p className="text-xs text-teal-400 mt-1.5">&rarr; {link}</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : (
            <><Send className="w-4 h-4" /> Send Now</>
          )}
        </button>

      </div>
    </div>
  )
}
