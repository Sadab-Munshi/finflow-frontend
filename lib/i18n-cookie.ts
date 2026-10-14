'use client'

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale, type Locale } from '@/i18n/config'

/**
 * Client-side locale switching: write the NEXT_LOCALE cookie (1y — product
 * decision: cookie-only, no DB sync in v1) and trigger a server re-render so
 * next-intl picks it up everywhere at once. Callers should follow with
 * `router.refresh()`.
 */
export function setLocaleCookie(locale: Locale) {
  if (!isLocale(locale)) return
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
}
