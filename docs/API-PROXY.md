# API proxy — how the browser reaches finflow-api

The backend (`finflow-api.sadabmunshi.me`) is **never** contacted by the browser.
Every call is same-origin and is relayed server-side by a Next.js route handler
that attaches a shared secret.

```
browser ──fetch('/api/ai/parse-text')──▶ Vercel app origin
                                          └─ app/api/[...path]/route.ts
                                               + X-Finflow-Proxy-Secret
                                               ──▶ finflow-api.sadabmunshi.me
```

## Why a route handler and not `rewrites()`

`next.config.ts` `rewrites()` and `vercel.json` `rewrites` can forward a path,
but neither can **add a request header** — Vercel's `headers` block only sets
*response* headers. Attaching a secret to the upstream request requires code
that runs on the server, so the proxy lives in `app/api/[...path]/route.ts`.
It is still served at `/api/*`, so the URL contract is unchanged.

## The secret

| Where | Variable | Scope |
|---|---|---|
| Frontend (Vercel project) | `FINFLOW_PROXY_SECRET` | server only — no `NEXT_PUBLIC_` prefix |
| Frontend (Vercel project) | `FINFLOW_API_ORIGIN` | server only |
| Backend (Oracle VM) | `PROXY_SECRET` | same value as `FINFLOW_PROXY_SECRET` |
| Backend (Oracle VM) | `ENFORCE_PROXY_SECRET` | `true` \| `false`, **default `false`** |

Because the secret is read by server code only, it is never inlined into the
client bundle, never appears in the network tab, and never appears in a log.

## Contract guarantees

- **Path is forwarded verbatim.** `/api/ai/parse-text` → `<backend>/api/ai/parse-text`.
  No route renaming, no prefix stripping. All 20 backend routers keep their URLs.
- **Query strings are preserved exactly** (`?q=`, filters, pagination).
- **Bodies pass through byte-for-byte** for JSON and multipart alike, so request
  and response schemas are unchanged. No envelope, no field renaming.
- **`Authorization: Bearer <jwt>` is forwarded unchanged.** The proxy adds a
  transport-level secret; it does not replace user authentication — finflow-api
  still validates the JWT itself.
- **Error payloads are passed through untouched**, so existing client error
  handling (`status`, `code`, `requiredTier`, `currentTier`) keeps working.

## Headers

Forwarded upstream: `authorization`, `content-type`, `accept`, `accept-language`.

Set upstream by the proxy:

- `X-Finflow-Proxy-Secret` — always overwritten; a client-supplied value is
  discarded so the header cannot be forged from the browser.
- `X-Forwarded-For` — a **single** authoritative client IP taken from Vercel's
  `x-real-ip`.

Deliberately **not** forwarded: `cookie` (auth travels as a Bearer token; the
Supabase session cookie has no business leaving our origin) and hop-by-hop
headers (`connection`, `transfer-encoding`, …).

Stripped from the response: `content-encoding` and `content-length` (fetch has
already decoded the body, so both describe a representation that no longer
exists). An upstream `Location` pointing at the backend origin is rewritten to
a same-origin path.

## Rate limiting (important)

finflow-api rate-limits per IP (`globalLimiter`, 300 req / 15 min) and runs with
`trust proxy: 1`. That trusts exactly **one** hop, so `req.ip` resolves from the
last `X-Forwarded-For` entry. If the proxy forwarded Vercel's header unchanged,
every user would collapse onto Vercel's egress IP and share one bucket. The
proxy therefore sends exactly one value — the real client IP — so per-user
buckets are preserved.

## Size limits

Vercel rejects request bodies above ~4.5 MB. The proxy fails early with a JSON
`413` above 4 MB, and receipt images are compressed client-side against a 3 MB
budget in `lib/image-compress.ts` before they are base64-encoded (~1.37×
inflation). PDFs cannot be downscaled in the browser and are rejected client
side with a translated message rather than a bare 413.

## Timeouts

The upstream call is bounded at 30 s; a hang returns `504` with a JSON body
instead of a platform error page.

## Rollout: enable enforcement later

The backend gate is **opt-in**. `ENFORCE_PROXY_SECRET` defaults to `false`, in
which case `requireProxySecret` is a no-op — the API accepts both proxied and
direct traffic. This is intentional: `finflow-admin`, cron jobs and webhooks
still call the API directly.

Exempt prefixes when enforcement is on (they authenticate with their own
secrets): `/api/health`, `/api/cron`, `/api/bot-notify`, `/api/telegram`,
`/api/whatsapp`. `finflow-admin` is deliberately **not** exempt — it must be
migrated to its own proxy first.

Order of work to turn enforcement on:

1. ✅ Deploy the frontend proxy and the backend gate with enforcement off.
2. ✅ Confirm production traffic arrives with the header and no direct browser
   calls remain.
3. ✅ `finflow-admin` has its own proxy (`finflow-admin/app/api/[...path]/route.ts`)
   plus server-only `FINFLOW_API_ORIGIN` / `FINFLOW_PROXY_SECRET`.
4. ⏳ Set `ENFORCE_PROXY_SECRET=true` on the backend, restart, watch for 403s.
5. ✅ Removed from `connect-src` (`next.config.ts`): both
   `https://finflow-api.sadabmunshi.me` and the `https://*.sadabmunshi.me`
   wildcard. The wildcard matched the backend host, so deleting the explicit
   entry alone would have changed nothing. `pay.` and `pay-api.` are kept
   explicitly (youpi checkout).

### Deploy checklist for enforcement

Set the same value in three places, then restart the API:

| Host | Variable |
|---|---|
| finflow-api (Oracle VM) | `PROXY_SECRET` + `ENFORCE_PROXY_SECRET=true` |
| finflow-frontend (Vercel) | `FINFLOW_PROXY_SECRET` |
| finflow-admin (Vercel) | `FINFLOW_PROXY_SECRET` |

Do **not** flip enforcement until both Vercel projects have the secret, or the
app that is missing it starts returning 403 on every panel request.

Still outstanding after that: drop `FINFLOW_API_ORIGIN` fallbacks to
`NEXT_PUBLIC_API_URL`, and narrow the remaining `https://*.sadabmunshi.me`
wildcards in `script-src` / `img-src` / `frame-src` (untouched here — they are
not `connect-src` and a wrong narrowing breaks the youpi checkout iframe).
