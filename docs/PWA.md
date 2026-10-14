---
name: pwa
description: Installability — manifest, service worker strategies, push wiring, update flow, versioning rules
last_updated: 2026-10-06
audience: [human, agent]
related: [deployment, architecture, config]
---

# PWA

FinFlow is installable: standalone display, icon set, screenshots, shortcuts,
offline-tolerant shell, and push notifications.

## Manifest (`public/site.webmanifest`)

- `start_url: /dashboard` (goes through middleware → `/login` if signed out),
  `display: standalone`, `orientation: portrait`, teal theme `#0d9488`.
- Icons 72–512 px incl. `maskable` variants + legacy `android-chrome-*`.
- 4 wide screenshots (`screen-*.png`) and 4 app shortcuts (`/add`, `/dashboard`,
  `/budgets`, `/reports`) — keep shortcuts aligned with real routes
  (`docs/ROUTES.md`).
- Linked from metadata: `app/layout.tsx:70` (`manifest: '/site.webmanifest'`)
  plus `appleWebApp` block (`:71-75`).

## Service worker (`public/sw.js`)

Registration: inline script in `app/layout.tsx:118-130` on window `load`;
scope `/` allowed via header (`next.config.ts:172`).

| Traffic | Strategy | Code |
|---|---|---|
| Non-GET / non-http(s) | bypass | `sw.js:41-45` |
| `/api/*` | network-first | `sw.js:50-52` (fresh data priority) |
| `/_next/static/*`, icons/images/fonts/css/js | cache-first | `sw.js:56-58, 68-70` |
| `*.supabase.co/storage/*` | stale-while-revalidate | `sw.js:62-64` (avatars) |
| HTML navigations | network-first | `sw.js:74` |
| precache @ install | 10 asset paths | `sw.js:3-13` |

## Versioning rules (read before editing `sw.js`)

1. `CACHE_NAME` (`sw.js:1`) is the only cache-buster — bump `finflow-v<n>` on
   every SW change; old caches are purged in `activate` (`:24-36`).
2. `skipWaiting` is called on install (`:21`) and on `SKIP_WAITING` message
   (`:134-138`); `clients.claim()` on activate (`:37`).
3. Because of long-lived immutable headers on `/icons`,`/images`,`/assets`
   (`next.config.ts:123-164`), replacing an image in place does nothing for a
   month — use new filenames.

## Update flow

`components/UpdateNotification.tsx:19-…` checks `registration.waiting` → shows a
prompt → posts `{ type: 'SKIP_WAITING' }` — the waiting worker activates and
`clients.claim()` takes over. Test matrix after SW edits: fresh profile,
already-installed PWA, tab left open during deploy.

## Push notifications

- Subscribe: `lib/push.ts:3-62` — checks support (`isPushSupported:91`), waits
  for `navigator.serviceWorker.ready`, fetches VAPID key from the API, subscribes,
  POSTs subscription to `POST /api/push/subscribe`.
- Unsubscribe: `lib/push.ts:75-89`.
- Re-arm on every login: `AuthListener` (`components/auth/AuthListener.tsx:23-27`)
  if permission already granted (non-intrusive).
- Message receive + display: `sw.js:78-109` (payload `{ title, body, icon,
  badge, tag, link }` w/ fallbacks); deep-link focus-or-open on click:
  `sw.js:111-131`.
- Send path is **server-side** (finflow-api); the CSP already allows push
  origins via `connect-src 'self'` + push services are browser-provided.
- Install prompt UI: `components/ui/InstallPrompt.tsx` (custom
  `beforeinstallprompt` handling).

## iOS caveats

- Push requires installed-to-homescreen on iOS 16.4+ (standard WebKit rule) —
  `appleWebApp` metadata + manifest set; `InstallPrompt` should steer iOS users
  to Add to Home Screen. <!-- TODO: verify current iOS copy in InstallPrompt -->
- No background fetch; badge count unsupported.
