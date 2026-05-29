'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { adminGetUsers, adminGetFeedback, adminBan } from '@/lib/api-client'

type FeedbackType = 'all' | 'general' | 'bug' | 'feature' | 'other'

const DATE_LOCALE = 'en-IN'

interface FeedbackItem {
  id: string
  user_id: string
  name: string
  email: string
  message: string
  type: string
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  general: 'bg-blue-900 text-blue-300',
  bug: 'bg-red-900 text-red-300',
  feature: 'bg-purple-900 text-purple-300',
  other: 'bg-gray-700 text-gray-300',
}

export default function AdminPanelClient() {
  const [activeTab, setActiveTab] = useState<'users' | 'feedback'>('users')

  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackType>('all')

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    const data = await adminGetUsers()
    setUsers(data.users || [])
    setUsersLoading(false)
  }, [])

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true)
    const data = await adminGetFeedback()
    setFeedback(data.feedback || [])
    setFeedbackLoading(false)
  }, [])

  const handleBan = async (userId: string, action: string, ipAddress?: string) => {
    await adminBan({ userId, action: action as 'ban' | 'unban' | 'ip_ban', reason: banReason, ipAddress })
    setBanReason('')
    setSelectedUser(null)
    loadUsers()
  }

  useEffect(() => {
    loadUsers()
    const interval = setInterval(loadUsers, 30000)
    return () => clearInterval(interval)
  }, [loadUsers])

  useEffect(() => {
    if (activeTab === 'feedback') loadFeedback()
  }, [activeTab, loadFeedback])

  const filteredFeedback = feedbackFilter === 'all'
    ? feedback
    : feedback.filter(f => f.type === feedbackFilter)

  const downloadCSV = () => {
    const headers = ['User', 'Email', 'Type', 'Message', 'Date']
    const rows = filteredFeedback.map(f => [
      `"${(f.name || '').replace(/"/g, '""')}"`,
      `"${(f.email || '').replace(/"/g, '""')}"`,
      f.type,
      `"${(f.message || '').replace(/"/g, '""')}"`,
      new Date(f.created_at).toLocaleString(DATE_LOCALE),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback-${feedbackFilter}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadJSON = () => {
    const json = JSON.stringify(filteredFeedback, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback-${feedbackFilter}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const FILTER_BUTTONS: { label: string; value: FeedbackType }[] = [
    { label: 'All', value: 'all' },
    { label: 'General', value: 'general' },
    { label: 'Bug', value: 'bug' },
    { label: 'Feature', value: 'feature' },
    { label: 'Other', value: 'other' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">FinFlow Admin</h1>
            <p className="text-xs text-gray-500 mt-0.5">Internal dashboard — restricted access</p>
          </div>
          <span className="text-sm text-gray-400">{users.length} users</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <p className="text-gray-400 text-[10px] uppercase tracking-wide">Total Users</p>
            <p className="text-xl font-bold mt-0.5">{users.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <p className="text-gray-400 text-[10px] uppercase tracking-wide">Banned</p>
            <p className="text-xl font-bold mt-0.5 text-red-400">{users.filter(u => u.is_banned).length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <p className="text-gray-400 text-[10px] uppercase tracking-wide">Active Today</p>
            <p className="text-xl font-bold mt-0.5 text-blue-400">
              {users.filter(u => u.last_sign_in && new Date(u.last_sign_in) > new Date(Date.now() - 86400000)).length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'users'
                ? 'bg-gray-700 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'feedback'
                ? 'bg-gray-700 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Feedback
            {feedback.length > 0 && (
              <span className="ml-1.5 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {feedback.length}
              </span>
            )}
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
            {usersLoading && users.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-500 text-sm">Loading users...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-[10px] text-gray-400 uppercase tracking-wide px-4 py-2.5">User</th>
                    <th className="text-left text-[10px] text-gray-400 uppercase tracking-wide px-4 py-2.5">Status</th>
                    <th className="text-left text-[10px] text-gray-400 uppercase tracking-wide px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 relative rounded-full bg-teal-700 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                            {user.avatar
                              ? <Image src={user.avatar} alt="" fill className="object-cover" sizes="28px" />
                              : user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {user.is_banned ? (
                          <span className="text-[10px] bg-red-900 text-red-300 px-2 py-0.5 rounded-full">Banned</span>
                        ) : (
                          <span className="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {selectedUser === user.id ? (
                            <>
                              <input
                                type="text"
                                placeholder="Ban reason"
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                className="bg-gray-700 text-white text-xs rounded-lg px-2 py-1 w-28 outline-none"
                              />
                              <button onClick={() => handleBan(user.id, 'ban')} className="text-xs bg-red-600 px-2 py-1 rounded-lg">Confirm</button>
                              <button onClick={() => setSelectedUser(null)} className="text-xs bg-gray-700 px-2 py-1 rounded-lg">Cancel</button>
                            </>
                          ) : (
                            user.is_banned ? (
                              <button onClick={() => { if (confirm('Unban this user?')) handleBan(user.id, 'unban') }} className="text-xs bg-green-700 px-2.5 py-1 rounded-lg">Unban</button>
                            ) : (
                              <>
                                <button onClick={() => setSelectedUser(user.id)} className="text-xs bg-red-700 px-2.5 py-1 rounded-lg">Ban</button>
                                {user.ip_address && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Ban all accounts from IP ${user.ip_address}?`)) {
                                        handleBan(user.id, 'ip_ban', user.ip_address)
                                      }
                                    }}
                                    className="text-xs bg-orange-700 hover:bg-orange-600 px-3 py-1 rounded-lg"
                                  >
                                    IP Ban
                                  </button>
                                )}
                              </>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1 flex-wrap">
                {FILTER_BUTTONS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setFeedbackFilter(value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                      feedbackFilter === value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    {label}
                    {value === 'all'
                      ? ` (${feedback.length})`
                      : ` (${feedback.filter(f => f.type === value).length})`}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={downloadCSV}
                  disabled={filteredFeedback.length === 0}
                  className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 px-2.5 py-1 rounded-lg disabled:opacity-40"
                >
                  CSV
                </button>
                <button
                  onClick={downloadJSON}
                  disabled={filteredFeedback.length === 0}
                  className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 px-2.5 py-1 rounded-lg disabled:opacity-40"
                >
                  JSON
                </button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
              {feedbackLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500 text-sm">Loading feedback...</div>
              ) : filteredFeedback.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-gray-500 text-sm">No feedback found</p>
                  {feedbackFilter !== 'all' && (
                    <button onClick={() => setFeedbackFilter('all')} className="text-xs text-indigo-400 hover:text-indigo-300">Show all</button>
                  )}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-[10px] text-gray-400 uppercase tracking-wide px-4 py-2.5">User</th>
                      <th className="text-left text-[10px] text-gray-400 uppercase tracking-wide px-4 py-2.5">Email</th>
                      <th className="text-left text-[10px] text-gray-400 uppercase tracking-wide px-4 py-2.5">Type</th>
                      <th className="text-left text-[10px] text-gray-400 uppercase tracking-wide px-4 py-2.5">Message</th>
                      <th className="text-left text-[10px] text-gray-400 uppercase tracking-wide px-4 py-2.5 whitespace-nowrap">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeedback.map(item => (
                      <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="text-sm font-medium">{item.name || <span className="text-gray-500 italic">--</span>}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-300">{item.email || '--'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[item.type] ?? 'bg-gray-700 text-gray-300'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-200 max-w-xs">
                          <p className="line-clamp-2 leading-snug" title={item.message}>{item.message}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString(DATE_LOCALE, { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
