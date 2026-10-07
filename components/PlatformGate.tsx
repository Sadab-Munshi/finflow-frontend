'use client'

import { useEffect, useState } from 'react'
import { Megaphone, RefreshCw, Wrench, X } from 'lucide-react'
import { authAppStatus } from '@/lib/api-client'

type Status = {
  maintenance: boolean
  read_only: boolean
  announcement: string | null
}

// Fetches platform flags once on mount. FAIL-SAFE: any fetch/parse failure
// renders nothing extra — the app never locks itself out on a network blip;
// only an affirmative `maintenance: true` response blocks usage.
export default function PlatformGate() {
  const [status, setStatus] = useState<Status | null>(null)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const dismissKey = (a: string) => `ff-announce-dismiss:${a}`
    authAppStatus()
      .then((s) => {
        if (cancelled) return
        const st: Status = {
          maintenance: !!s.maintenance,
          read_only: !!s.read_only,
          announcement: s.announcement || null,
        }
        if (st.announcement && sessionStorage.getItem(dismissKey(st.announcement))) {
          st.announcement = null
        }
        setStatus(st)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!status) return null

  if (status.maintenance) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 px-6">
        <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <Wrench className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-white">FinFlow is under maintenance</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            We're making a few improvements. Your data is safe — please check back in a little while.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-500"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {status.read_only && (
        <div className="fixed inset-x-0 top-0 z-[9998] bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
          FinFlow is in read-only mode — viewing works, but changes may not be saved right now.
        </div>
      )}
      {status.announcement && !announcementDismissed && (
        <div
          className={`fixed inset-x-0 z-[9998] flex items-center justify-center gap-2 bg-teal-700 px-4 py-1.5 text-xs font-medium text-white ${
            status.read_only ? 'top-6' : 'top-0'
          }`}
        >
          <Megaphone className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[85%] truncate">{status.announcement}</span>
          <button
            aria-label="Dismiss announcement"
            onClick={() => {
              sessionStorage.setItem(`ff-announce-dismiss:${status.announcement}`, '1')
              setAnnouncementDismissed(true)
            }}
            className="rounded p-0.5 hover:bg-white/15"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  )
}
