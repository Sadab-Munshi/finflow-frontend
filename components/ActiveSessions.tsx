'use client'

import { useEffect, useState } from 'react'
import { Monitor, Smartphone, Tablet, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Session = {
  id: string
  device_name: string
  browser: string
  os: string
  ip_address: string
  last_active_at: string
  is_current: boolean
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [logoutingId, setLogoutingId] = useState<string | null>(null)
  const [logoutingAll, setLogoutingAll] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    setLoading(true)
    const res = await fetch('/api/sessions')
    const data = await res.json()
    setSessions(data.sessions ?? [])
    setLoading(false)
  }

  async function logoutSession(id: string) {
    setLogoutingId(id)
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== id))
    setLogoutingId(null)
  }

  async function logoutAllOthers() {
    setLogoutingAll(true)
    await fetch('/api/sessions/logout-others', { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.is_current))
    setLogoutingAll(false)
  }

  function DeviceIcon({ type }: { type: string }) {
    if (type === 'Mobile') return <Smartphone className="w-5 h-5 text-teal-600" />
    if (type === 'Tablet') return <Tablet className="w-5 h-5 text-teal-600" />
    return <Monitor className="w-5 h-5 text-teal-600" />
  }

  const otherSessions = sessions.filter(s => !s.is_current)

  return (
    <div className="mt-8">
      {/* Section Header — matches existing page style */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">
        Active Sessions
      </p>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden divide-y divide-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {sessions.map(session => (
              <div key={session.id} className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
                  <DeviceIcon type={session.device_name} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {session.device_name}
                    </span>
                    {session.is_current && (
                      <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {session.browser} · {session.os}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Active {formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Logout button (not for current device) */}
                {!session.is_current && (
                  <button
                    onClick={() => logoutSession(session.id)}
                    disabled={logoutingId === session.id}
                    className="text-xs text-red-500 font-medium shrink-0 hover:text-red-700 disabled:opacity-50 min-h-[44px] px-2 flex items-center"
                  >
                    {logoutingId === session.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Log out'
                    )}
                  </button>
                )}
              </div>
            ))}

            {/* No other sessions state */}
            {otherSessions.length === 0 && !loading && (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                No other active sessions
              </div>
            )}

            {/* Log out all others button */}
            {otherSessions.length > 0 && (
              <div className="p-4">
                <button
                  onClick={logoutAllOthers}
                  disabled={logoutingAll}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {logoutingAll ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Logging out...</>
                  ) : (
                    'Log out all other devices'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
