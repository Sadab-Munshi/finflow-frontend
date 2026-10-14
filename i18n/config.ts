export const LOCALES = ['en', 'hi', 'bn'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

// Cookie holding the user's locale preference. Written client-side by the
// profile language selector (1y maxAge, per product decision: cookie-only,
// no DB sync in v1). Server-side this never needs a "set" — see
// components/profile read path & lib/i18n-cookie.ts.
export const LOCALE_COOKIE = 'NEXT_LOCALE'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  hi: 'हिंदी',
  bn: 'বাংলা',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
