'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'

/**
 * Dashboard display preferences.
 *
 * These are per-device UI choices, not account data, so they live in
 * localStorage beside the sidebar preference (`finflow:sidebar`) rather than in
 * the database — no API round-trip, no server state to keep in sync, and the
 * choice survives a tab switch, a reload and a returning visit.
 *
 * Keys are namespaced with `finflow:` to match the existing convention.
 */

export type DashboardView = 'month' | 'all'

export const DASHBOARD_VIEW_KEY = 'finflow:dashboard:view'
export const DASHBOARD_HIDE_BALANCE_KEY = 'finflow:dashboard:hide-balance'

/** Server-render defaults. The first client render must produce the same
 *  markup as the server, so localStorage is only read after mount. */
export const DEFAULT_VIEW: DashboardView = 'month'
export const DEFAULT_HIDE_BALANCE = false

function readView(): DashboardView {
  try {
    return window.localStorage.getItem(DASHBOARD_VIEW_KEY) === 'all' ? 'all' : DEFAULT_VIEW
  } catch {
    return DEFAULT_VIEW
  }
}

function writeView(view: DashboardView) {
  try {
    window.localStorage.setItem(DASHBOARD_VIEW_KEY, view)
  } catch {
    /* private mode / storage disabled — the session still works */
  }
}

function readHideBalance(): boolean {
  try {
    return window.localStorage.getItem(DASHBOARD_HIDE_BALANCE_KEY) === 'true'
  } catch {
    return DEFAULT_HIDE_BALANCE
  }
}

function writeHideBalance(hidden: boolean) {
  try {
    window.localStorage.setItem(DASHBOARD_HIDE_BALANCE_KEY, String(hidden))
  } catch {
    /* private mode / storage disabled — the session still works */
  }
}

/**
 * Restores and persists the dashboard's display preferences.
 *
 * Both values are restored in a layout effect, which runs after hydration but
 * *before* the browser paints. That matters for `hideBalance` specifically: it
 * is a privacy control, so restoring it any later would paint the real balance
 * for a frame on every navigation and defeat the point of hiding it.
 *
 * Values also re-sync when another tab changes them (`storage` event), so two
 * open tabs never disagree about whether the balance is hidden.
 */
export function useDashboardPrefs() {
  // SSR + first client render use the defaults; the layout effect adopts the
  // stored values immediately afterwards, before anything is painted.
  const [dashboardView, setDashboardViewState] = useState<DashboardView>(DEFAULT_VIEW)
  const [hideBalance, setHideBalanceState] = useState<boolean>(DEFAULT_HIDE_BALANCE)

  useLayoutEffect(() => {
    setDashboardViewState(readView())
    setHideBalanceState(readHideBalance())
  }, [])

  // Keep other tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DASHBOARD_VIEW_KEY) setDashboardViewState(readView())
      if (e.key === DASHBOARD_HIDE_BALANCE_KEY) setHideBalanceState(readHideBalance())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setDashboardView = useCallback((view: DashboardView) => {
    setDashboardViewState(view)
    writeView(view)
  }, [])

  const setHideBalance = useCallback((hidden: boolean) => {
    setHideBalanceState(hidden)
    writeHideBalance(hidden)
  }, [])

  const toggleHideBalance = useCallback(() => {
    setHideBalanceState(prev => {
      const next = !prev
      writeHideBalance(next)
      return next
    })
  }, [])

  return { dashboardView, setDashboardView, hideBalance, setHideBalance, toggleHideBalance }
}
