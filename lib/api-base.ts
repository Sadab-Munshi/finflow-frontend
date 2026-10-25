/**
 * Base URL for every client → backend request.
 *
 * In the browser this is the empty string, so all traffic is same-origin:
 * `/api/ai/parse-text` is handled by `app/api/[...path]/route.ts`, which relays
 * it to finflow-api with the `X-Finflow-Proxy-Secret` header attached
 * server-side.
 *
 * This function is deliberately careful about what it reads:
 *
 *  - It never touches `NEXT_PUBLIC_API_URL`, because Next.js inlines
 *    `NEXT_PUBLIC_*` values into the client bundle at build time. Reading it
 *    here would put the backend hostname back into shipped JavaScript and
 *    defeat the whole point of the proxy.
 *  - The server branch reads `FINFLOW_API_ORIGIN`, a non-public variable, so
 *    the bundler replaces it with `undefined` in client builds while server
 *    code (route handlers, server components) still sees the real value.
 *
 * Server-side callers must remember that `fetch('/api/...')` is invalid in
 * Node — the absolute origin returned here is what makes that work.
 */
export function apiBase(): string {
  // Browser: always same-origin. Never the backend host.
  if (typeof window !== 'undefined') return ''

  const origin = process.env.FINFLOW_API_ORIGIN
  if (origin) return origin.replace(/\/+$/, '')

  // Local development: the Next server proxies to the local finflow-api.
  return 'http://localhost:3001'
}
