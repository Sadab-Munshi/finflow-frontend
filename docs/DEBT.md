---
name: debt
description: Technical debt register — security, correctness, leftovers, and hygiene with severity and fixes
last_updated: 2026-10-06
audience: [human, agent]
related: [agents, migration-notes, conventions]
---

# Technical Debt Register

From the 2026-10-06 recon. High = security/correctness in prod · Medium =
broken surface / duplicated logic · Low = hygiene.

| Area | File | Issue | Severity | Suggested fix |
|---|---|---|---|---|
| Security | `lib/api-client.ts:69` | `NEXT_PUBLIC_INTERNAL_API_SECRET` ships the API's `INTERNAL_API_SECRET` into the browser bundle — anyone can read it and call `/api/check-ban`/`/api/check-ip-ban` | High | Proxy those calls through a new `app/api/check-ban/route.ts` server handler using a server-only var; drop the public var |
| Security | `lib/api-client.ts:206` | `NEXT_PUBLIC_BOT_SECRET` ships `WEBHOOK_SECRET` — lets anyone trigger budget-alert emails for any userId | High | Same pattern: thin server route handler holding the secret; or make the API endpoint JWT-scoped instead of secret-gated |
| Security | `lib/posthog.ts:5` | Hardcoded PostHog fallback project key committed to source | Medium | Remove fallback; fail-closed when `NEXT_PUBLIC_POSTHOG_KEY` unset |
| Auth gaps | `lib/supabase/middleware.ts:30-41` | `/analytics`, `/backup-restore`, `/privacy-security` excluded from `protectedRoutes` — unauthenticated users get a shell that fails later | High | Add the three paths (they're app pages) or document intentional client-gating |
| Auth drift | `app/admin-dy26zyfv/page.tsx:16-22` vs API repo | Frontend admin gate checks `settings.is_admin` (DB row); backend `requireAdmin` checks `app_metadata.role/is_admin` — two definitions of "admin" can diverge | High | Pick one source (recommend app_metadata), align both repos |
| Admin UX | `app/admin-dy26zyfv/page.tsx` | Obfuscated path is the only "protection" discoverability-wise; fine as obscurity, but it also means no link checking — stale if renamed | Low | Document rename procedure (done in `docs/ROUTES.md`) |
| Cron config | `vercel.json:6-14` | Crons point at nonexistent `/api/cron/*` in this app | High | Move schedules to finflow-api's deployment (or add proxy handlers) |
| Dead deps | `package.json` | `web-push`, `@getbrevo/brevo`, `bcryptjs`, `@types/bcryptjs` unused after backend split | Medium | `npm uninstall` after a final grep |
| Dead code | `lib/supabase/server.ts:5-9` | `createServiceClient` unused | Low | Delete or use deliberately (never from client) |
| Dead code | `app/layout.tsx:104-108` | `finflow_visitor` cookie read/generated but never set | Low | Set the cookie (Max-Age, SameSite=Lax) or remove the block |
| Dead code | `lib/api-client.ts:160-168` | `testAuth`/`testAuthAdmin` unreferenced (API test routes also flagged in API repo debt) | Low | Remove both sides together |
| CSP | `next.config.ts:102` | `connect-src` includes `https://api.mistral.ai` — provider no longer used | Low | Prune; re-check remaining allowlisted origins per deploy |
| SEO | `public/robots.txt:4` vs `app/layout.tsx:31` | Host mismatch (`app.` vs `www.app.`) for sitemap/canonical | Medium | Pick canonical host; align robots, sitemap, Vercel redirects |
| SEO | `app/sitemap.ts` | Only 3 URLs; legal/support/guide pages unlisted | Low | Add public pages to sitemap |
| Data layer | `lib/storage.ts` | localStorage mirror of transactions/budgets/settings runs in parallel with Supabase — reads may diverge, unclear which paths still use it | Medium | Audit consumers (`grep "from '@/lib/storage'"`); retire for server-backed tables, keep only guest/self-contained bits if any |
| Type safety | repo-wide (verified 2026-10-06) | `npx tsc --noEmit` **fails: 19 errors** in `lib/supabase/middleware.ts` (6), `lib/storage.ts` (5), `lib/supabase/server.ts` (4), `app/history/page.tsx` (3), `context/UserContext.tsx` (1) — hidden by `ignoreBuildErrors` (`next.config.ts:7-9`) | High | Fix bottom-up (supabase client typings first), then re-enable `ignoreBuildErrors: false` |
| Lint | repo-wide (verified 2026-10-06) | `npm run lint` **fails: 19 problems** — 5× `no-explicit-any` (`InstallPrompt.tsx:47`, `AdminPanelClient.tsx:139`, others), `react-hooks/set-state-in-effect` (`InstallPrompt.tsx:40`), exhaustive-deps (`Layout.tsx:60,85,103,190,193,378,381`, `budgets/page.tsx:151,191`, `NotificationBell.tsx:126`), 1 unused eslint-disable | Medium | Fix per-rule; keep the gate mandatory in CONTRIBUTING |
| Type safety | `next.config.ts:4-9` | `ignoreDuringBuilds` + `ignoreBuildErrors` hide lint/type failures from CI | Medium | Run `next lint` + `tsc --noEmit` in a CI job until they can be re-enabled |
| `any` usage | `components/ui/InstallPrompt.tsx`, `app/admin-dy26zyfv/AdminPanelClient.tsx` (+ 3 more lint hits) | `any` escapes flagged by lint (verified) | Low | Proper types (`BeforeInstallPromptEvent`, admin typings) |
| Perf | `app/layout.tsx:118-130` | Inline SW registration script blocks CSP `'unsafe-inline'` requirement in `script-src` | Low | Move to a tiny client component registering SW in an effect; then tighten CSP |
| Consistency | app pages | 636-853 LOC client pages repeat fetch/skeleton/error patterns | Low | Extract a `useQuery`-lite hook or adopt an RSC-first pattern for one page as pilot |
