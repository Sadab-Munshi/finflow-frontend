---
name: auth
description: Authentication — middleware rules, the three Supabase clients, OAuth, email+Turnstile, listener, callback
last_updated: 2026-10-06
audience: [human, agent]
related: [architecture, routes, state, agents]
---

# Authentication

Provider: Supabase Auth. Sessions live in cookies managed by `@supabase/ssr`;
the browser never stores tokens itself.

## The three clients — use the right one

| Client | Context | File | Notes |
|---|---|---|---|
| Browser | client components, `useEffect` | `lib/supabase/client.ts:3-8` (`createBrowserClient`, anon key) | RLS-scoped, sees the session cookie |
| Server | RSC render, route handlers | `lib/supabase/server.ts:13-34` (await `cookies()`; `createServerClient`) | swallows `setAll` errors in RSC (cookies read-only there) |
| Middleware | edge interceptor | `lib/supabase/middleware.ts:3-34` | re-emits rotated cookies onto the response — **this is why session refresh works** |

Fourth export `createServiceClient` (`lib/supabase/server.ts:5-9`, service-role
key, bypasses RLS) is **unused** — server-only if revived; never import into
client code (`docs/DEBT.md`). Cross-import rules: `docs/CONVENTIONS.md`.

## Middleware rules (`middleware.ts` → `updateSession`)

1. Runs on every matched request (matcher excludes static assets,
   `middleware.ts:9-11`; coverage table in `docs/ROUTES.md`).
2. Refreshes the session and mirrors cookie mutations onto the response
   (`lib/supabase/middleware.ts:14-30`).
3. `protectedRoutes` (`:30-41`): `/dashboard /history /add /budgets /insights
   /reports /settings /transaction /profile /notifications` (prefix match, `:43`).
   No user → `307 /login` (`:49`).
4. User present on a protected route → DB ban check on `user_management`
   (`:55-72`): `is_banned || ip_banned` → `/login?banned=true`. A check failure
   logs and **lets the request through** (fail-open, `:70-72`).
5. Notably absent from the list: `/analytics`, `/backup-restore`,
   `/privacy-security`, `/admin-*` (self-guarded) — see `docs/DEBT.md`.

## Email + password + Turnstile

- Both `LoginForm` and `SignupForm` embed `components/auth/TurnstileWidget.tsx`
  (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
- ShowCaptcha → submit → `authVerifyTurnstile(token)` calls **finflow-api**
  (`POST /api/auth/verify-turnstile`, `components/auth/LoginForm.tsx:55`) — the
  secret never lives in this app. Failed/missing token blocks submission.
- Sign-in: `supabase.auth.signInWithPassword`. Sign-up:
  `signUp` → email confirmation link → `/auth/callback`.
- After successful signup the client fires `authWelcomeEmail(fullName, email)`
  (`LoginForm.tsx:102`) → API sends the Brevo welcome email.
- `validator` UX bits: `PasswordStrengthMeter`, `emailSuggestion.ts`
  (typo-domain hints) in `components/auth/`.

## OAuth

- `GoogleButton` / `MicrosoftButton` (`components/auth/`) call
  `supabase.auth.signInWithOAuth({ provider, options: { redirectTo:
  <origin>/auth/callback } })`. Providers must be enabled in Supabase with this
  callback URL allow-listed. <!-- TODO: verify Microsoft provider is enabled in the Supabase project -->

## AuthListener (`components/auth/AuthListener.tsx`)

Mounted once in the root layout (`app/layout.tsx:7`). Subscribes
`onAuthStateChange` (`:13`):
- `SIGNED_IN` (`:19-31`): writes `finflow_current_user_id` to localStorage and,
  if permission already granted, re-subscribes push (`:23-27` dynamic
  `import('@/lib/push')`).
- `SIGNED_OUT` (`:33-…`): clears state and routes to `/login`.

## UserContext server-side effects (post-login)

`context/UserContext.tsx` — after `getUser()` resolves:
1. `trackLogin(userId, email)` → API (`:92`) — IP/geo/device row.
2. Heartbeat: upsert `user_heartbeat` every 30 s (`:95-107`).
3. Ban polling: `checkBan` + `checkIpBan` every 20 s (`:155-181`) → on ban,
   `signOut()` + redirect `/login?banned=true`.
Dual-layer enforcement: middleware (edge) + this polling loop (live sessions).

## `/auth/callback` (route handler)

`app/auth/callback/route.ts` (GET):
- `?code` → `exchangeCodeForSession` (`:11`).
- `&type=signup` → **local sign-out then** `/login?confirmed=true` (`:14-18`) —
  deliberate: fresh signups land logged-out with a "confirmed" banner; comment
  notes the param is safely ignorable if tampered with.
- Else → `next` param (default `/dashboard`). Error/missing code →
  `/login?error=auth_callback_error` (`:24`).

## Ban flow (end-to-end)

Admin ban (API) → `user_management`/`banned_ips` rows → three enforcement
points here: middleware per navigation (`lib/supabase/middleware.ts:62-67`),
20 s poll in `UserContext:155-181`, and login-page banner via `?banned=true`
(read in `app/(auth)/login/LoginContent.tsx` via `useSearchParams`).

## Session/token refresh

There is no manual refresh code and no client-side refresh endpoints: `ssr`
clients auto-rotate on `getUser()`; the middleware path is the refresh engine
(invariant #1, `docs/ARCHITECTURE.md`). finflow-api calls just take
`session?.access_token` per request (`lib/api-client.ts:14-18`).
