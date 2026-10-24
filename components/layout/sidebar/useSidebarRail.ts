'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Where the user's desktop preference lives (mirrored by the bootstrap script). */
export const SIDEBAR_STORAGE_KEY = 'finflow:sidebar'
/** At or above this width the expanded panel is the default. */
export const SIDEBAR_WIDE_BREAKPOINT = 1200
/** Below this width navigation becomes an overlay drawer. */
export const SIDEBAR_DESKTOP_BREAKPOINT = 900

export type SidebarState = 'expanded' | 'collapsed'

const ATTR = 'data-ff-sidebar'

function readPreference(): SidebarState {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed' ? 'collapsed' : 'expanded'
  } catch {
    return 'expanded'
  }
}

function writePreference(state: SidebarState) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, state)
  } catch {
    /* private mode / storage disabled — the session still works */
  }
}

/**
 * Applies the visual state. Geometry lives entirely in CSS (globals.css) keyed
 * off `[data-ff-sidebar]` on <html>, so flipping this attribute is the whole
 * update: no React re-render, no layout thrash, and the same expression is used
 * by the pre-paint bootstrap script in app/layout.tsx.
 */
function applyState(state: SidebarState) {
  document.documentElement.setAttribute(ATTR, state)
}

function currentState(): SidebarState {
  return document.documentElement.getAttribute(ATTR) === 'collapsed' ? 'collapsed' : 'expanded'
}

/**
 * Desktop sidebar expand/collapse.
 *
 * - ≥1200px: expanded by default, the choice is persisted per device.
 * - 900–1199px: the icon rail is the default so the dashboard keeps its width;
 *   expanding is allowed but only remembered for the current session.
 * - <900px: irrelevant — navigation is an overlay drawer there.
 */
export function useSidebarRail() {
  // SSR + first client render assume expanded; the <html> attribute (written
  // before paint) is adopted immediately after mount so no visible jump occurs.
  const [collapsed, setCollapsed] = useState(false)
  const compactExpandedRef = useRef(false)

  const reconcile = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth < SIDEBAR_DESKTOP_BREAKPOINT) return
    const next: SidebarState =
      window.innerWidth >= SIDEBAR_WIDE_BREAKPOINT
        ? readPreference()
        : compactExpandedRef.current
          ? 'expanded'
          : 'collapsed'
    applyState(next)
    setCollapsed(next === 'collapsed')
  }, [])

  // Adopt the state the bootstrap script already painted.
  useEffect(() => {
    setCollapsed(currentState() === 'collapsed')
    reconcile()
  }, [reconcile])

  // Re-derive when the window crosses either breakpoint.
  useEffect(() => {
    let frame = 0
    const onResize = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (window.innerWidth >= SIDEBAR_DESKTOP_BREAKPOINT) reconcile()
      })
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [reconcile])

  /** Toggle and return the state that was applied. */
  const toggle = useCallback((): SidebarState => {
    const next: SidebarState = currentState() === 'collapsed' ? 'expanded' : 'collapsed'
    applyState(next)
    setCollapsed(next === 'collapsed')
    if (window.innerWidth >= SIDEBAR_WIDE_BREAKPOINT) {
      writePreference(next)
      compactExpandedRef.current = false
    } else {
      compactExpandedRef.current = next === 'expanded'
    }
    return next
  }, [])

  return { collapsed, toggle }
}
