---
name: architecture
description: System design — request flow, route groups, feature map, key flows, invariants
last_updated: 2026-10-06
audience: [human, agent]
related: [agents, routes, auth, state, conventions]
---

# FinFlow Frontend Architecture

Next.js 15 App Router PWA for personal finance. Supabase provides Auth +
Postgres (with RLS) + Storage; a separate Express backend (`finflow-api`) owns
AI calls, emails, push delivery, and admin operations. Despite being an
App Router app, **almost every app page is a client component** that fetches via
Supabase/browser calls in `useEffect`; server components cover public
marketing/auth pages and the root layout. State is two
React contexts only. Deployed on Vercel (region `bom1`, `vercel.json:2`).

## Request flow

```
Browser
  │  1. HTTP request
  ▼
middleware.ts ─────────────────────────────────────────────────────┐
  matcher: everything except _next/static|image, icons, files       │
  → updateSession() (lib/supabase/middleware.ts:4)                  │
    a. refresh/rotate Supabase session cookie                       │
    b. protected list (:30) & no user → 307 /login                  │
    c. user on protected route → DB ban check (:55-72)              │
       banned → /login?banned=true                                  │
  ▼
App Router server layer
  ├─ app/layout.tsx (RSC): metadata/OG/JSON-LD, font,
  │     providers (Language, User, AuthListener, PostHog, Toaster),
  │     inline SW registration script (:111-123)
  └─ route handler: app/auth/callback/route.ts (OAuth/email confirm)
  ▼
Client components ('use client') — dashboards & app pages
  ├─→ Supabase  (lib/supabase/client.ts → direct DB w/ RLS, Auth, Storage)
  └─→ finflow-api (lib/api-client.ts → Bearer JWT → /api/*)
        AI parse/STT · receipts · insights · notifications · push ·
        ban checks · track-login · reports
```

## Route groups

| Group | Contents | Purpose |
|---|---|---|
| `(landing)` | `/`, `/terms`, `/privacy`, `/disclaimer`, `/support`, `/user-guide` | public marketing/legal; shared layout (`app/(landing)/layout.tsx`) |
| `(auth)` | `/login`, `/signup`, `/forgot-password`, `/reset-password` | public auth flow; pages keep metadata via thin server wrappers over client content (pattern: `app/(auth)/login/page.tsx` → `LoginContent.tsx`) |
| (ungrouped) | `/dashboard`, `/add`, `/history`, `/budgets`, `/insights`, `/reports`, `/analytics`, `/notifications`, `/profile`, `/settings`, `/privacy-security`, `/backup-restore`, `/transaction/[id]` | the app itself — client pages behind middleware |

## Feature → file map

| Feature | App route | Supporting code |
|---|---|---|
| Dashboard | `app/dashboard/page.tsx` | `lib/db.ts`, `context/UserContext.tsx`, monthly aggregation in-page |
| Add transaction (4 tabs) | `app/add/page.tsx` + `app/add/components/*` + `app/add/hooks/useTransaction.tsx` | `lib/api-client.ts:93-110` (parse-text/receipt/speech), `lib/db.ts:17` |
| History / PDF export | `app/history/page.tsx` | dynamic `import('jspdf')` at `:148` |
| Budgets | `app/budgets/page.tsx` | `lib/db.ts:92-138` |
| Insights (Groq) | `app/insights/page.tsx` | `lib/api-client.ts:113` (`aiInsights`) |
| Analytics suite | `app/analytics/page.tsx` + `components/analytics/*` | `lib/analytics-api.ts:44-62`, Recharts |
| Reports | `app/reports/page.tsx` | `lib/api-client.ts:234` (`getReports`) |
| Notifications | `app/notifications/page.tsx` + `components/notifications/*` | `lib/api-client.ts:170-220`, `lib/notification-utils.ts` |
| Auth | `app/(auth)/*`, `components/auth/*`, `app/auth/callback/route.ts` | `docs/AUTH.md` |
| i18n | — | `context/LanguageContext.tsx` (en/hi/bn) |
| PWA / push | — | `public/sw.js`, `lib/push.ts`, `components/UpdateNotification.tsx` |
| Analytics telemetry | — | `lib/posthog.ts`, `components/PostHogProvider.tsx` |

## Key flows

### 1. Login (email + Turnstile / OAuth)
1. `/login` renders `LoginForm` w/ `TurnstileWidget` (site key from
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `components/auth/TurnstileWidget.tsx`).
2. On submit, token is verified **server-side by finflow-api**:
   `authVerifyTurnstile` → `POST /api/auth/verify-turnstile` (`components/auth/LoginForm.tsx:55`).
3. `supabase.auth.signInWithPassword` (or OAuth redirect with `next=/dashboard`).
4. Middleware refreshes session on next request; `AuthListener` reacts to
   `SIGNED_IN`: stores `finflow_current_user_id` and re-arms push
   (`components/auth/AuthListener.tsx:13-33`).
5. `UserProvider` then: `trackLogin` (`context/UserContext.tsx:92`), starts
   heartbeat + ban polling. Failed login keeps user in-place with toast.

### 2. Add transaction ×4 tabs
1. `/add` renders `ManualTab | NLPTab | VoiceTab | ScanTab` sharing `PreviewCard`.
2. NLP: text → `aiParseText` → finflow-api (`/api/ai/parse-text`).
   Voice: `MediaRecorder` → `aiSpeechToText` multipart → transcript+parsed.
   Scan: file → base64 → `aiParseReceipt`.
3. Parsed drafts land in the shared preview state (`app/add/hooks/useTransaction.tsx`)
   with confidence flags; user edits/confirms.
4. Confirm → `addTransaction` (`lib/db.ts:17`) direct to Supabase (RLS-scoped),
   then local refresh. `validateTransactionDate` (`lib/validateTransactionDate.ts`)
   blocks bad dates before insert.
5. On returning to `/dashboard`, budget alerts may be triggered via
   `budgetAlertCheck` (finflow-api, `lib/api-client.ts:205`).

### 3. Push notifications
1. `lib/push.ts:3` `subscribeToPush`: SW ready → `pushManager.subscribe` with
   `applicationServerKey` from `GET /api/push/vapid-public-key`.
2. Subscription JSON → `POST /api/push/subscribe` (`lib/api-client.ts:340`);
   backend stores rows in `push_subscriptions`.
3. Backend (or its cron/report job) sends → browser `push` event handled in
   `public/sw.js:78` → `showNotification`; click handler
   `notificationclick` (`sw.js:111`) focuses/opens the deep link.
4. Permission/re-subscription maintained on each login via `AuthListener:23-27`.
5. SW updates surface through `components/UpdateNotification.tsx` → posts
   `SKIP_WAITING` (`sw.js:134-138`).

## Invariants

1. The three Supabase clients are context-bound: browser (`lib/supabase/client.ts`),
   server components/route handlers (`lib/supabase/server.ts`), middleware
   (`lib/supabase/middleware.ts`) — never cross-import (`docs/AUTH.md`).
2. Auto-protected routes = exactly the list in `lib/supabase/middleware.ts:30-45`;
   anything else is public. Do not widen silently (decide per-page instead).
3. All finflow-api traffic goes through `lib/api-client.ts` (Bearer from session,
   `:20-44`) — the API never sees cookies, only JWTs.
4. All displayed/stored dates go through IST helpers in `lib/utils.ts`
   (`normalizeDateToYMD:23`, `toIndianDate:57`, `getISTDateOffset:120`).
5. Global state = `UserContext` + `LanguageContext` only, provided once in
   `app/layout.tsx:5-7`.
6. Static assets under `/icons`, `/images`, `/assets` are
   `max-age=2592000, immutable` (`next.config.ts:123-164`) — changing their
   contents requires a new filename, not an overwrite.
7. `public/sw.js` cache-busts **only** via `CACHE_NAME` (`public/sw.js:1`);
   bump on every SW change (`docs/PWA.md#versioning`).
8. There is no admin UI in this repo: admin moved to a separate domain
   (2026-10-06, `docs/DECISIONS.md` ADR-6 — superseded). The `settings.is_admin`
   column still exists in the DB but nothing here reads it; never reintroduce
   a privileged surface behind an obscured path.
9. Builds tolerate nothing locally: `ignoreDuringBuilds` +
   `ignoreBuildErrors` (`next.config.ts:4-9`) mean `npm run lint` and
   `npx tsc --noEmit` are the only honest gates.
10. RLS is the DB authorization layer for direct client queries — every new
    table read from the browser needs a policy in `supabase/migrations/`
    (`docs/SCHEMA.md`).
