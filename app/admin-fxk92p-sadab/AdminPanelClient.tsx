'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function AdminPanelClient() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [clearingNotifs, setClearingNotifs] = useState(false)
  const [clearResult, setClearResult] = useState('')

  const handleClearTestNotifications = async () => {
    if (!confirm('Delete all notifications with title "Test" or "Ok"?')) return
    setClearingNotifs(true)
    setClearResult('')
    const res = await fetch('/api/admin/clear-test-notifications', { method: 'POST' })
    const data = await res.json()
    setClearingNotifs(false)
    if (data.ok) {
      setClearResult(`Deleted ${data.deleted} test notification(s)`)
    } else {
      setClearResult(`Error: ${data.error}`)
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }

  const handleBan = async (userId: string, action: string, ipAddress?: string) => {
    await fetch('/api/admin/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, reason: banReason, ipAddress })
    })
    setBanReason('')
    setSelectedUser(null)
    loadUsers()
  }

  useEffect(() => {
    loadUsers()
    const interval = setInterval(loadUsers, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">FinFlow Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{users.length} total users</span>
            <span className="text-sm text-green-400">{users.filter(u => u.is_online).length} online</span>
            <button onClick={loadUsers} className="text-sm bg-gray-800 px-4 py-2 rounded-xl">Refresh</button>
            <button
              onClick={handleClearTestNotifications}
              disabled={clearingNotifs}
              className="text-sm bg-yellow-800 px-4 py-2 rounded-xl disabled:opacity-50"
            >
              {clearingNotifs ? 'Clearing…' : 'Clear Test Notifications'}
            </button>
            {clearResult && <span className="text-xs text-gray-300">{clearResult}</span>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">Total Users</p>
            <p className="text-2xl font-bold mt-1">{users.length}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">Online Now</p>
            <p className="text-2xl font-bold mt-1 text-green-400">{users.filter(u => u.is_online).length}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">Banned</p>
            <p className="text-2xl font-bold mt-1 text-red-400">{users.filter(u => u.is_banned).length}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">Active Today</p>
            <p className="text-2xl font-bold mt-1 text-blue-400">{users.filter(u => u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 86400000)).length}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-400 px-4 py-3">User</th>
                <th className="text-left text-xs text-gray-400 px-4 py-3">Status</th>
                <th className="text-left text-xs text-gray-400 px-4 py-3">IP</th>
                <th className="text-left text-xs text-gray-400 px-4 py-3">City</th>
                <th className="text-left text-xs text-gray-400 px-4 py-3">Last Seen</th>
                <th className="text-left text-xs text-gray-400 px-4 py-3">Logins</th>
                <th className="text-left text-xs text-gray-400 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 relative rounded-full bg-teal-700 flex items-center justify-center text-sm font-bold overflow-hidden">
                          {user.avatar ? <Image src={user.avatar} alt="User avatar" fill className="object-cover" sizes="32px" /> : user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${user.is_online ? 'bg-green-400' : 'bg-gray-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name || user.email}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_banned ? (
                      <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full">Banned</span>
                    ) : (
                      <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">{user.ip_address || '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{user.city ? `${user.city}, ${user.country}` : '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {user.is_online ? (
                      <span className="text-green-400">Online</span>
                    ) : user.last_seen ? (
                      new Date(user.last_seen).toLocaleString('en-IN')
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">{user.login_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {selectedUser === user.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Ban reason"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            className="bg-gray-700 text-white text-xs rounded-lg px-2 py-1 w-28 outline-none"
                          />
                          <button onClick={() => handleBan(user.id, 'ban', user.ip_address)} className="text-xs bg-red-600 px-2 py-1 rounded-lg">Confirm</button>
                          <button onClick={() => setSelectedUser(null)} className="text-xs bg-gray-700 px-2 py-1 rounded-lg">Cancel</button>
                        </div>
                      ) : (
                        <>
                          {user.is_banned ? (
                            <button onClick={() => { if (confirm('Are you sure you want to unban this user?')) handleBan(user.id, 'unban') }} className="text-xs bg-green-700 px-3 py-1 rounded-lg">Unban</button>
                          ) : (
                            <button onClick={() => setSelectedUser(user.id)} className="text-xs bg-red-700 px-3 py-1 rounded-lg">Ban</button>
                          )}
                          {user.ip_address && (
                            <button onClick={() => handleBan(user.id, 'ip_ban', user.ip_address)} className="text-xs bg-orange-700 px-3 py-1 rounded-lg">IP Ban</button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
