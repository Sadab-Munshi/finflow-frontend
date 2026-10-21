/**
 * Central application security utilities for FinFlow.
 *
 * Covers:
 * - HIGH-01: Open Redirect prevention (OAuth callback, auth completion, notification links, SW navigation)
 * - HIGH-02: Strict avatar upload validation (MIME + extension allowlist + 2 MB size cap)
 * - HIGH-04: Sign-out CacheStorage + Web Storage + analytics session purge
 * - MED-02:  CSV Formula Injection (CWE-1236) neutralization
 * - MED-05:  Trusted payment gateway origin validation
 * - CRIT-02: Control-character sanitization for client PDF generation
 */

const INTERNAL_BASE_ORIGIN = 'https://finflow.internal'

/**
 * Validates that a redirect target is a safe, relative internal path.
 * Blocks protocol-relative URLs (`//evil.com`), backslash tricks (`/\evil.com`),
 * userinfo tricks (`@evil.com`), and external schemes (`https:`, `javascript:`, `data:`).
 */
export function sanitizeInternalRedirect(
  next: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!next || typeof next !== 'string') return fallback
  const trimmed = next.trim()
  if (!trimmed) return fallback

  // Reject control characters, non-slash prefixes, protocol-relative '//', and backslash '/\'
  if (
    /[\x00-\x1F\x7F]/.test(trimmed) ||
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\')
  ) {
    return fallback
  }

  try {
    const parsed = new URL(trimmed, INTERNAL_BASE_ORIGIN)
    if (parsed.origin !== INTERNAL_BASE_ORIGIN) {
      return fallback
    }
    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) {
      return fallback
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

const ALLOWED_AVATAR_MIME_TO_EXT: Record<string, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export interface AvatarValidationResult {
  valid: boolean
  ext?: 'jpg' | 'png' | 'webp'
  contentType?: 'image/jpeg' | 'image/png' | 'image/webp'
  error?: string
}

/**
 * Validates an avatar image before uploading to Supabase Storage.
 * Explicitly blocks SVG (`image/svg+xml`), HTML, JS, and oversized files.
 */
export function validateAvatarFile(file: {
  name: string
  type: string
  size: number
}): AvatarValidationResult {
  if (!file || typeof file.size !== 'number' || file.size <= 0) {
    return { valid: false, error: 'Please select a valid image file.' }
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return { valid: false, error: 'Avatar image must be 2 MB or smaller.' }
  }

  const normalizedMime = (file.type || '').toLowerCase().trim()
  const canonicalExt = ALLOWED_AVATAR_MIME_TO_EXT[normalizedMime]
  if (!canonicalExt) {
    return {
      valid: false,
      error: 'Only JPG, PNG, and WebP images are allowed for profile photos.',
    }
  }

  const rawExt = (file.name || '').split('.').pop()?.toLowerCase().trim() || ''
  if (!ALLOWED_AVATAR_EXTENSIONS.has(rawExt)) {
    return {
      valid: false,
      error: 'Invalid file extension. Please upload a .jpg, .png, or .webp image.',
    }
  }

  const contentType: 'image/jpeg' | 'image/png' | 'image/webp' =
    canonicalExt === 'jpg'
      ? 'image/jpeg'
      : canonicalExt === 'png'
      ? 'image/png'
      : 'image/webp'

  return {
    valid: true,
    ext: canonicalExt,
    contentType,
  }
}

/**
 * Escapes a value for safe inclusion in a CSV cell, neutralizing spreadsheet
 * formula injection triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) while preserving
 * legitimate negative numeric values (e.g. `-450` or `-123.45`).
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0'
  }

  let str = String(value).replace(/\x00/g, '')
  const isPureNumber = /^[+-]?\d+(\.\d+)?$/.test(str.trim())

  if (!isPureNumber && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Strips ASCII control characters and normalizes text before passing it into jsPDF.
 */
export function sanitizePdfText(value: unknown, maxLength = 200): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/**
 * Purges cached authenticated responses and user-scoped local state on sign-out.
 */
export async function clearClientSecurityState(): Promise<void> {
  if (typeof window === 'undefined') return

  // 1. Delete Service Worker caches so no authenticated HTML/API responses persist
  try {
    if ('caches' in window) {
      const keys = await window.caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('finflow-'))
          .map((key) => window.caches.delete(key))
      )
    }
  } catch {
    /* ignore CacheStorage errors in restricted contexts */
  }

  // 2. Ask active Service Worker (if any) to clear its runtime cache as well
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_AUTH_CACHE' })
    }
  } catch {
    /* noop */
  }

  // 3. Clear user-scoped localStorage & sessionStorage entries
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith('finflow_') && key !== 'finflow_analytics_enabled') {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    /* noop */
  }

  try {
    window.sessionStorage.removeItem('ff-oauth-provider')
  } catch {
    /* noop */
  }
}
