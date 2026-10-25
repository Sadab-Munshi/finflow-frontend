import { NextResponse, type NextRequest } from 'next/server'

/**
 * Same-origin relay to finflow-api.
 *
 * The browser never learns the backend hostname: every client call goes to
 * `/api/*` on this app's own origin and is relayed here, server-side, with the
 * shared `X-Finflow-Proxy-Secret` header attached. The secret therefore lives
 * only in the Vercel project env — never in the client bundle, the network tab,
 * or a console log.
 *
 * Contract notes (do not change casually):
 *  - The path is forwarded verbatim: `/api/ai/parse-text` → `<backend>/api/ai/parse-text`.
 *    No rewriting, so all 20 backend routers keep their existing URLs.
 *  - Bodies are passed through byte-for-byte (JSON and multipart alike), so the
 *    request/response schemas are untouched.
 *  - `Authorization: Bearer <jwt>` is forwarded unchanged; finflow-api still
 *    authenticates the user itself. This proxy adds a transport secret, it does
 *    not replace user auth.
 */

export const runtime = 'nodejs'
// Never prerender or cache: the upstream response is per-user and per-request.
export const dynamic = 'force-dynamic'

/** Vercel rejects request bodies above ~4.5 MB; fail early with a useful error. */
const MAX_BODY_BYTES = 4 * 1024 * 1024

/** Give the upstream a bounded window so a hung backend returns a clean 504. */
const UPSTREAM_TIMEOUT_MS = 30_000

/** Hop-by-hop headers (RFC 9110 §7.6.1) that must not be forwarded either way. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

/**
 * Explicit path translations for the versioned backend surface.
 *
 * The relay forwards paths verbatim by default (that is the contract the other
 * 20 routers rely on). The one exception is the versioned user API: the client
 * calls `/api/user/bootstrap` while finflow-api mounts it at
 * `/api/v1/user/bootstrap`. Keeping the rewrite here — rather than making the
 * client speak `/api/v1/...` — means the browser-facing URL stays stable if the
 * backend version ever moves.
 */
const PATH_REWRITES: Array<{ match: RegExp; replace: string }> = [
  { match: /^user\//, replace: 'v1/user/' },
]

function rewritePath(suffix: string): string {
  for (const rule of PATH_REWRITES) {
    if (rule.match.test(suffix)) return suffix.replace(rule.match, rule.replace)
  }
  return suffix
}

function backendOrigin(): string {
  const raw =
    process.env.FINFLOW_API_ORIGIN ||
    // Legacy/local convenience only. On Vercel set FINFLOW_API_ORIGIN.
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001'
  return raw.replace(/\/+$/, '')
}

/**
 * The real client IP, as seen by Vercel.
 *
 * finflow-api rate-limits per IP (`globalLimiter`, 300 req / 15 min) and runs
 * with `trust proxy: 1`, so it resolves `req.ip` from the *last* X-Forwarded-For
 * entry after trusting one hop. If we forwarded Vercel's own header unchanged,
 * every user would collapse onto Vercel's egress IP and share one bucket. We
 * therefore send exactly one authoritative value, taken from the header Vercel
 * sets itself and clients cannot spoof (`x-real-ip`).
 */
function clientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    // Vercel appends the observed peer as the final entry.
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return ''
}

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers()

  // Forward only what the backend actually consumes.
  const forward = ['authorization', 'content-type', 'accept', 'accept-language']
  for (const name of forward) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  // Never trust a client-supplied secret: overwrite unconditionally below.
  headers.delete('x-finflow-proxy-secret')

  const secret = process.env.FINFLOW_PROXY_SECRET
  if (secret) headers.set('X-Finflow-Proxy-Secret', secret)

  const ip = clientIp(request)
  if (ip) headers.set('X-Forwarded-For', ip)

  // Cookies are deliberately NOT forwarded — auth travels as a Bearer token,
  // and the Supabase session cookie has no business leaving our origin.
  return headers
}

function buildResponseHeaders(upstream: Response): Headers {
  const headers = new Headers()

  upstream.headers.forEach((value, key) => {
    const name = key.toLowerCase()
    if (HOP_BY_HOP.has(name)) return
    // fetch() already decoded the body, so both of these describe a
    // representation we no longer have. Let the runtime recompute them.
    if (name === 'content-encoding' || name === 'content-length') return
    headers.set(key, value)
  })

  // Defensive: never let an upstream redirect point the browser at the
  // backend origin. Rewrite to a same-origin path if it ever does.
  const location = headers.get('location')
  if (location) {
    const origin = backendOrigin()
    if (location.startsWith(origin)) {
      headers.set('location', location.slice(origin.length) || '/')
    }
  }

  return headers
}

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const suffix = rewritePath(path.map(encodeURIComponent).join('/'))
  const target = `${backendOrigin()}/api/${suffix}`
  // Preserve the query string exactly (filters, pagination, ?q=, etc).
  const search = request.nextUrl.search
  const url = `${target}${search}`

  const method = request.method.toUpperCase()

  const declaredLength = Number(request.headers.get('content-length') || '0')
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        error: 'Payload too large',
        message: 'This file is too large to upload. Please use a smaller file.',
      },
      { status: 413 }
    )
  }

  let body: ArrayBuffer | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const buffer = await request.arrayBuffer()
      if (buffer.byteLength > MAX_BODY_BYTES) {
        return NextResponse.json(
          {
            error: 'Payload too large',
            message: 'This file is too large to upload. Please use a smaller file.',
          },
          { status: 413 }
        )
      }
      // An empty body must be `undefined`, not a zero-length buffer — Express
      // rejects a 0-byte body sent with a JSON content-type.
      body = buffer.byteLength > 0 ? buffer : undefined
    } catch {
      return NextResponse.json(
        { error: 'Bad request', message: 'Could not read the request body.' },
        { status: 400 }
      )
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const upstream = await fetch(url, {
      method,
      headers: buildUpstreamHeaders(request),
      body,
      // Do not follow redirects upstream: pass the status through and let
      // buildResponseHeaders() rewrite the Location if needed.
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
    })

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: buildResponseHeaders(upstream),
    })
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    console.error('[api-proxy] upstream failure:', aborted ? 'timeout' : err)
    return NextResponse.json(
      aborted
        ? { error: 'Gateway timeout', message: 'The server took too long to respond. Please try again.' }
        : { error: 'Bad gateway', message: 'The server is unreachable. Please try again.' },
      { status: aborted ? 504 : 502 }
    )
  } finally {
    clearTimeout(timer)
  }
}

type RouteContext = { params: Promise<{ path?: string[] }> }

async function handler(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  const segments = path ?? []
  if (segments.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return proxy(request, segments)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const HEAD = handler

/** Same-origin requests don't preflight, but answer if one ever arrives. */
export async function OPTIONS(): Promise<Response> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
  })
}
