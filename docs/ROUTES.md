---
name: routes
description: Route inventory — every app/ path with auth level, rendering mode, and notes
last_updated: 2026-10-06
audience: [human, agent]
related: [architecture, auth, agents]
---

# Route Inventory

**Auth** column: `MW` = in middleware `protectedRoutes` (`lib/supabase/middleware.ts:30-45`)
→ server-side redirect to `/login` + ban check · `Public` = reachable logged
out. **Rendering**: RSC = server component, CC = `'use client'` page.

## App routes

| Path | File | Auth | Rendering | Notes |
|---|---|---|---|---|
| `/` | `app/(landing)/page.tsx` | Public | RSC w/ metadata → client `HomeContent` | marketing home |
| `/terms` | `app/(landing)/terms/page.tsx` | Public | RSC | legal |
| `/privacy` | `app/(landing)/privacy/page.tsx` | Public | RSC | legal |
| `/disclaimer` | `app/(landing)/disclaimer/page.tsx` | Public | RSC | legal |
| `/support` | `app/(landing)/support/page.tsx` | Public | RSC shell → `SupportContent` | sends feedback via API client |
| `/user-guide` | `app/(landing)/user-guide/page.tsx` | Public | RSC shell → `UserGuideContent` | |
| `/login` | `app/(auth)/login/page.tsx` → `LoginContent.tsx` | Public | RSC metadata shell; Suspense boundary for `useSearchParams` (`LoginContent.tsx:38`) | reads `?banned`, `?confirmed`, `?error` params |
| `/signup` | `app/(auth)/signup/page.tsx` | Public | RSC shell → `SignupForm` | Turnstile-gated; welcome email after signup |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Public | CC | Supabase reset email |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Public | CC | consumes recovery session |
| `/dashboard` | `app/dashboard/page.tsx` | MW | CC | 636 LOC; data in `useEffect` via `lib/db.ts:8` |
| `/add` | `app/add/page.tsx` | MW | CC | tabs: `ManualTab`, `NLPTab`, `VoiceTab`, `ScanTab` (+`ParticleSphere`) |
| `/history` | `app/history/page.tsx` | MW | CC | dynamic `import('jspdf')` for export (`:148`) |
| `/budgets` | `app/budgets/page.tsx` | MW | CC | 853 LOC |
| `/insights` | `app/insights/page.tsx` | MW | CC | Groq insights via API client |
| `/reports` | `app/reports/page.tsx` | MW | CC | lists backend-generated reports (`app/reports/page.tsx:65`) |
| `/analytics` | `app/analytics/page.tsx` | MW | CC | 4-feature analytics suite; has `loading.tsx` |
| `/notifications` | `app/notifications/page.tsx` | MW | CC | + `NotificationBell` in layout shell |
| `/profile` | `app/profile/page.tsx` | MW | CC | avatar upload → Supabase Storage |
| `/settings` | `app/settings/page.tsx` | MW | CC | language/currency/alert prefs |
| `/privacy-security` | `app/privacy-security/page.tsx` | MW | CC | |
| `/backup-restore` | `app/backup-restore/page.tsx` | MW | CC | export/import JSON |
| `/transaction/[id]` | `app/transaction/[id]/page.tsx` | MW (prefix `/transaction`) | CC | |

## Route handlers & generated routes

| Path | File | Auth | Notes |
|---|---|---|---|
| `/auth/callback` | `app/auth/callback/route.ts` | Public | GET only. `code` → `exchangeCodeForSession`; `type=signup` → sign-out + `/login?confirmed=true`; `next` param (default `/dashboard`); failure → `/login?error=auth_callback_error` |
| `/sitemap.xml` | `app/sitemap.ts` | Public | 8 URLs: `/`, `/login`, `/signup` + `/terms`, `/privacy`, `/disclaimer`, `/support`, `/user-guide` (`:23`) — see `docs/SEO.md` |
| `/robots.txt` | `public/robots.txt` | Public | static; sitemap URL host differs from `metadataBase` (`docs/SEO.md`) |
| `/site.webmanifest` · `/sw.js` · icons | `public/` | Public | PWA surface — `docs/PWA.md`; `/sw.js` served `must-revalidate` (`next.config.ts:166-173`) |
| `/BingSiteAuth.xml` | `public/BingSiteAuth.xml` | Public | Bing verification file (deploy asset) |

No `app/api/` directory exists — all backend calls go cross-origin to finflow-api.
`vercel.json` declares only the deployment region (`bom1`); no crons or proxies
live here anymore.

## `loading.tsx` → page mapping

| loading.tsx | Skeleton used | Page |
|---|---|---|
| `app/dashboard/loading.tsx` | `DashboardSkeleton` | `/dashboard` |
| `app/history/loading.tsx` | `HistorySkeleton` | `/history` |
| `app/budgets/loading.tsx` | `BudgetsSkeleton` | `/budgets` |
| `app/insights/loading.tsx` | `InsightsSkeleton` | `/insights` |
| `app/analytics/loading.tsx` | `AnalyticsSkeleton` | `/analytics` |
| `app/notifications/loading.tsx` | `NotificationsSkeleton` | `/notifications` |
| `app/profile/loading.tsx` | `ProfileSkeleton` | `/profile` |
| `app/settings/loading.tsx` | `SettingsSkeleton` | `/settings` |
| — | `ReportsSkeleton` | `/reports` (orphan — no loading.tsx; likely used in-page) <!-- TODO: verify usage --> |
| — | `TransactionDetailSkeleton` | `/transaction/[id]` (orphan, same) |

## `/auth/callback` flow

```
Supabase OAuth provider ──redirect──▶ /auth/callback?code=…&next=/dashboard
Email confirm link (type=signup) ──▶ /auth/callback?code=…&type=signup
                                       │
        exchangeCodeForSession(code) (route.ts:11)
                                       ├─ ok + type=signup → signOut(local) → /login?confirmed=true
                                       ├─ ok → /{next}
                                       └─ err/no code → /login?error=auth_callback_error
```
(the comment at `route.ts:14-16` documents the deliberate sign-out so new signups
start unauthenticated).

## Middleware matcher coverage

`middleware.ts:9-11` runs on all paths **except** `_next/static`, `_next/image`,
`favicon.ico`, `og-image.png`, `apple-touch-icon.png`, `sitemap.xml`,
`robots.txt`, and `*.{svg,png,jpg,jpeg,gif,webp}` — HTML navigations, RSC
payloads, and `/auth/callback` all pass through `updateSession`.
