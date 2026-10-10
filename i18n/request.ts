import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './config'

// next-intl "without i18n routing": locale comes from the NEXT_LOCALE cookie
// (written by the language selector, 1y), falling back to the browser's
// Accept-Language header, then English. Messages are loaded per namespace
// with English merged underneath as the fallback layer — a missing hi/bn key
// renders English, never an error.
const NAMESPACES = [
  'common',
  'nav',
  'add',
  'dashboard',
  'history',
  'transaction',
  'budgets',
  'insights',
  'reports',
  'settings',
  'profile',
] as const

async function loadNamespace(locale: Locale, ns: string): Promise<Record<string, string>> {
  try {
    return ((await import(`../messages/${locale}/${ns}.json`)).default as Record<string, string>) || {}
  } catch {
    return {}
  }
}

export default getRequestConfig(async () => {
  const [store, headerStore] = await Promise.all([cookies(), headers()])
  const cookieLocale = store.get(LOCALE_COOKIE)?.value

  let locale: Locale = DEFAULT_LOCALE
  if (isLocale(cookieLocale)) {
    locale = cookieLocale
  } else {
    const accept = headerStore.get('accept-language') ?? ''
    if (/^(hi)([,-]|$)/i.test(accept)) locale = 'hi'
    else if (/^(bn)([,-]|$)/i.test(accept)) locale = 'bn'
  }

  const messages: Record<string, Record<string, string>> = {}
  for (const ns of NAMESPACES) {
    const [en, other] = await Promise.all([
      loadNamespace(DEFAULT_LOCALE, ns),
      locale === DEFAULT_LOCALE ? Promise.resolve({}) : loadNamespace(locale, ns),
    ])
    messages[ns] = { ...en, ...other }
  }

  return { locale, messages }
})
