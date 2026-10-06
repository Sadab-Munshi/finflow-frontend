---
name: decisions
description: Reverse-engineered architectural decisions with context, alternatives, rationale, and file evidence
last_updated: 2026-10-06
audience: [human, agent]
related: [architecture, conventions, debt, migration-notes]
---

# Architectural Decisions (reverse-engineered from code)

## ADR-1 · Split the backend out; keep browser-direct Supabase for own-user CRUD

| | |
|---|---|
| **Decision** | AI/email/push/admin/jobs live in finflow-api (Express); this app keeps direct browser→Supabase reads/writes for 7 RLS tables. |
| **Context** | Next.js route handlers were growing into a second backend with heavy jobs (PDF, cron). |
| **Alternatives** | Keep monolith API routes; go "BFF-only" where every DB call passes through the API. |
| **Rationale** | Heavy/privileged work gets a real server; simple own-user CRUD keeps low latency and zero proxy cost thanks to RLS. |
| **File evidence** | `lib/api-client.ts` (all privileged calls), `lib/db.ts` (direct CRUD), `supabase/migrations/001_create_tables.sql` (RLS), `docs/MIGRATION_NOTES.md`. |
| **Cost** | Two auth checks to reason about (RLS + API JWT); two definitions of admin drifted (debt). |

## ADR-2 · Triple-client Supabase split with cookie-synced sessions

| | |
|---|---|
| **Decision** | `@supabase/ssr` browser/server/middleware clients; middleware doubles as session-refresh engine and auth gate. |
| **Alternatives** | Client-only auth with route-group guards; JWT in localStorage. |
| **Rationale** | Cookie sessions allow server-side redirects before any page code runs; single refresh point prevents stale token races. |
| **File evidence** | `lib/supabase/{client,server,middleware}.ts`, cookie `getAll/setAll` pattern at `middleware.ts:14-30`. |

## ADR-3 · Client-component app pages over RSC data fetching

| | |
|---|---|
| **Decision** | App pages fetch in `useEffect` and show domain skeletons; RSC is reserved for landing/auth shells, admin guard, layout. |
| **Alternatives** | RSC data fetching + streaming; React Server Functions. |
| **Rationale** | Pages need immediate interactivity + PostHog + contexts; data is per-user so static rendering buys little; skeletons mask the waterfalls. |
| **File evidence** | `'use client'` on `app/dashboard/page.tsx:1` (and 12 siblings), `components/skeletons/*`, loading map in `docs/ROUTES.md`. |
| **Cost** | Bigger JS bundles (mitigated by dynamic imports + vendor chunks, `next.config.ts:38-84`); the old README told the opposite story. |

## ADR-4 · Two contexts and no state library

| | |
|---|---|
| **Decision** | Global state = `UserContext` (identity/user) + `LanguageContext` (i18n); domain data re-fetched per page. |
| **Alternatives** | Redux/Zustand/React Query. |
| **Rationale** | Small team, few shared objects; adding a store for two concerns solved by context would be ceremony. |
| **File evidence** | providers mounted once at `app/layout.tsx:5-7`; no store deps in `package.json`. |
| **Cost** | Duplicate fetches across pages (accepted; see `docs/STATE.md`). |

## ADR-5 · i18n as an inline 3-language key map with key-as-fallback

| | |
|---|---|
| **Decision** | ~48 keys × en/hi/bn inline in `LanguageContext.tsx`; `t(key)` renders the key when a translation is missing. |
| **Alternatives** | next-intl/ICU files, server-driven translations. |
| **Rationale** | Zero dependency, tiny string surface; India-first audience needs exactly 3 languages. |
| **File evidence** | `context/LanguageContext.tsx:5-186`, fallback at `:179`. |
| **Cost** | Typos in keys fail silently; ~48-key ceiling is being approached (lint-size discipline). |

## ADR-6 · Obfuscated admin path + server-side is_admin gate

| | |
|---|---|
| **Decision** | Admin UI lives at `/admin-dy26zyfv` — unlinked anywhere in the UI — with a real RSC check of `settings.is_admin`. |
| **Alternatives** | Separate admin app/domain; same path + middleware admin matcher. |
| **Rationale** | Cheap discovery protection while keeping one deploy; the *actual* security is the server-side gate + API's `requireAdmin` on every admin endpoint (`finflow-api/src/routes/admin.ts:22`). |
| **File evidence** | `app/admin-dy26zyfv/page.tsx:11-23` (redirect/show "Not authorized"). |
| **Cost** | Obscurity is not security; user/DB role sources can drift (debt). |

## ADR-7 · Manual service-worker versioning over a framework (Workbox)

| | |
|---|---|
| **Decision** | Hand-rolled `public/sw.js` with a single `CACHE_NAME` bump + in-app update prompt; mixed strategies per asset class. |
| **Alternatives** | Workbox/next-pwa codegen. |
| **Rationale** | Full control over the update UX and per-class strategies (API must stay network-first for money data); avoids build-time plugin complexity. |
| **File evidence** | `public/sw.js:1-138`, `components/UpdateNotification.tsx:11-12`, header for revalidation `next.config.ts:166-173`. |
| **Cost** | Discipline: forgetting the bump = stuck caches (rule in `docs/PWA.md`). |

## ADR-8 · Turnstile verification delegated to the backend

| | |
|---|---|
| **Decision** | The frontend only collects the widget token; `siteverify` runs inside finflow-api, so no Turnstile secret exists here. |
| **Alternatives** | Next.js route handler doing siteverify; client-side-only gating. |
| **Rationale** | Backend already held the secret post-split; one verifier = one place to rotate. |
| **File evidence** | `authVerifyTurnstile` (`lib/api-client.ts:142`), call site `components/auth/LoginForm.tsx:55`; no `TURNSTILE_SECRET_KEY` consumer in repo (grep-verified). |
