---
name: debt
description: Technical debt register — security, correctness, leftovers, and hygiene with severity and fixes
last_updated: 2026-10-06
audience: [human, agent]
related: [agents, migration-notes, conventions]
---

# Technical Debt Register

High = security/correctness in prod · Medium = broken surface / duplicated
logic · Low = hygiene. **BLOCKED** = frontend side is done; the fix needs a
finflow-api change (exact API-side change listed).

## Active debt

| Area | File | Issue | Severity | Suggested fix |
|---|---|---|---|---|
| Security (BLOCKED) | finflow-api `src/routes/ban.ts:22,50` | Frontend `checkBan`/`checkIpBan` (`lib/api-client.ts:209-213`) now send the user's Bearer JWT, but those API endpoints only accept `x-internal-secret` → 401 until the API changes; frontend fails open (see `context/UserContext.tsx`) | High | finflow-api: accept `Authorization: Bearer` via `authMiddleware` alongside the secret; scope `check-ban` to `userId === req.user.id` |
| Security (BLOCKED) | finflow-api `src/routes/notifications.ts:161` | `budgetAlertCheck` (`lib/api-client.ts:177-185`) sends Bearer JWT to `POST /api/notifications/budget-alert`, but that route is secret-gated — its Bearer branch is dead because `authMiddleware` isn't mounted | High | finflow-api: mount `authMiddleware` on the route so the JWT branch (reads `req.user.id`) activates |
| Security | `components/auth/SignupForm.tsx` (and `LoginForm.tsx`) | Turnstile is verified only inside the form submit flow; a bot calling `supabase.auth.signUp` directly bypasses the widget entirely | Medium | Enable Supabase Auth captcha (Turnstile) enforcement project-side so the direct call also requires a token |
| Security | `lib/supabase/middleware.ts:56`, `context/UserContext.tsx` | Ban enforcement is a page gate + client redirect only; a banned user can still hit Supabase/API directly. Whether finflow-api rejects banned users on data endpoints is unverified <!-- TODO: verify --> | Medium | Enforce ban status server-side in finflow-api |
| Type safety | repo-wide (verified 2026-10-06) | `npx tsc --noEmit` **fails: 19 errors** — `lib/supabase/middleware.ts:15-20` (6), `lib/storage.ts:109-202` (5), `lib/supabase/server.ts:15-17` (4), `app/history/page.tsx:102,537` (3), `context/UserContext.tsx:92` (1); hidden from builds by `ignoreBuildErrors` (`next.config.ts:8`) | High | Fix bottom-up (supabase client typings first), then `ignoreBuildErrors: false` |
| Lint | repo-wide (verified 2026-10-06) | `npm run lint` **fails: 37 problems** (17 errors: react-compiler component-creation / set-state-in-effect, 4× `no-explicit-any` — `components/ui/InstallPrompt.tsx:47,53`, `app/analytics/page.tsx:118`, `app/insights/page.tsx:23`; 20 warnings: exhaustive-deps, unused vars) | Medium | Fix per-rule; keep the gate mandatory in CONTRIBUTING |
| Type safety | `next.config.ts:4-9` | `ignoreDuringBuilds` + `ignoreBuildErrors` hide lint/type failures from builds | Medium | Run `next lint` + `tsc --noEmit` in CI until they can be re-enabled |
| Data layer | `lib/storage.ts` | localStorage mirror of transactions/budgets/settings runs in parallel with Supabase — reads may diverge, unclear which paths still use it | Medium | Audit consumers (`grep "from '@/lib/storage'"`); retire for server-backed tables, keep only guest/self-contained bits if any |
| SEO | `app/layout.tsx:29` vs `public/robots.txt:4` | Host mismatch: `metadataBase` uses `www.app.sadabmunshi.me`, robots sitemap URL uses `app.sadabmunshi.me` — canonical/sitemap disagree | Medium | Pick canonical host; align robots, sitemap, Vercel redirects |
| `any` usage | `components/ui/InstallPrompt.tsx:47,53` (+ 2 more lint hits) | `any` escapes flagged by lint (verified) | Low | Proper types (`BeforeInstallPromptEvent`, analytics payload typings) |
| Perf | `app/layout.tsx:111-123` | Inline SW registration script forces `'unsafe-inline'` in `script-src` | Low | Move to a tiny client component registering the SW in an effect; then tighten CSP |
| Consistency | app pages | Large client pages repeat fetch/skeleton/error patterns | Low | Extract a `useQuery`-lite hook or adopt an RSC-first pattern for one page as pilot |

## Resolved 2026-10-06 (branch `fix/security-remove-admin`)

- Browser-shipped secrets removed (`NEXT_PUBLIC_INTERNAL_API_SECRET`, `NEXT_PUBLIC_BOT_SECRET`); ban/budget-alert calls now use the user's Bearer JWT.
- Hardcoded PostHog fallback key removed — telemetry no-ops when `NEXT_PUBLIC_POSTHOG_KEY` is unset (`lib/posthog.ts:4-5`).
- `/analytics`, `/backup-restore`, `/privacy-security` added to `protectedRoutes` (`lib/supabase/middleware.ts:41-43`).
- Admin removed (moved to a separate domain): `app/admin-dy26zyfv/` deleted, `admin*` API helpers + `testAuth`/`testAuthAdmin` dropped from `lib/api-client.ts`; the frontend/backend admin-definition drift is gone.
- Dead `vercel.json` crons (pointed at nonexistent `/api/cron/*`) removed — file is now `{ "regions": ["bom1"] }`.
- `createServiceClient` deleted — `SUPABASE_SERVICE_ROLE_KEY` has no consumer left.
- `finflow_visitor` cookie block removed from `app/layout.tsx`; pages now prerender statically, so the public Supabase env vars are required at build time.
- Dead deps uninstalled: `web-push`, `@types/web-push`, `@getbrevo/brevo`, `bcryptjs`, `@types/bcryptjs`.
- `https://api.mistral.ai` pruned from CSP `connect-src` (`next.config.ts:101`).
- Sitemap now lists `/terms`, `/privacy`, `/disclaimer`, `/support`, `/user-guide` (`app/sitemap.ts:23`).
