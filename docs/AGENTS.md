---
name: agents
description: Highest-priority entry point for AI agents — commands, rules, boundaries, checklists for finflow-frontend
last_updated: 2026-10-06
audience: [agent]
related: [architecture, conventions, auth, routes, secrets-map]
---

# AGENTS.md — Working on finflow-frontend

Next.js 15 (App Router) + TypeScript frontend for the FinFlow personal finance
app. Supabase for auth/DB, a separate Express backend (`finflow-api`) for AI and
integrations. **Code is the source of truth — when this file and code disagree,
fix this file.**

## Read first (in order)

1. `docs/ARCHITECTURE.md` — request flow, route groups, invariants
2. `docs/CONVENTIONS.md` — server/client rules, styling, forbidden patterns
3. `docs/AUTH.md` — middleware + Supabase clients (most bugs live at this boundary)
4. Task-specific: `docs/ROUTES.md` · `docs/STATE.md` · `docs/CONFIG.md` ·
   `docs/PWA.md` · `docs/ANALYTICS.md` · `docs/DESIGN_SYSTEM.md`

## Commands (from `package.json:5-10`)

```bash
npm install        # install
npm run dev        # dev server on PORT 3000 (next dev --port 3000)
npm run build      # production build (NOTE: lint+TS errors are IGNORED, next.config.ts:4-9)
npm start          # serve production build
npm run lint       # next lint — run manually, builds skip it
# tests: NOT CONFIGURED — no test framework in package.json (manual testing only)
```

Boot needs `.env.local` with the Supabase vars — names in `.env.example`,
details in `docs/CONFIG.md`.

## Directory table

| Path | Purpose | Rules |
|---|---|---|
| `app/` | App Router pages/layouts/route handlers | URL surface — every folder change updates `docs/ROUTES.md` |
| `app/(auth)/`, `app/(landing)/` | public route groups (no URL prefix) | must stay reachable logged-out |
| `components/` | reusable UI by domain (`auth/`, `ui/`, `skeletons/`, `analytics/`, …) | primitives in `ui/` stay generic |
| `context/` | `UserContext.tsx`, `LanguageContext.tsx` — the ONLY global state | see `docs/STATE.md` |
| `lib/` | clients, CRUD, utils; `lib/supabase/{client,server,middleware}.ts` | browser vs server split — `docs/AUTH.md` |
| `types/` | form interfaces (`auth.ts`) | |
| `public/` | static assets, `sw.js`, `site.webmanifest`, icons | cache behavior: `docs/PWA.md` |
| `supabase/migrations/` | only `001_create_tables.sql` (RLS) | manual apply — `docs/SCHEMA.md` |
| `docs/`, `skills/` | documentation + task checklists | keep in sync with code |

## Server vs client — the rules that matter

1. App pages are overwhelmingly **client components** (`'use client'` on
   `app/dashboard/page.tsx:1` etc.) that fetch in `useEffect` — documented
   reality; do not refute it with the old README story.
2. Server components exist at: admin guard shell (`app/admin-dy26zyfv/page.tsx:5`),
   public landing/auth pages (metadata + thin client wrappers), root layout.
3. Never import `lib/supabase/server.ts` into a client component (uses
   `next/headers`); never import `lib/supabase/client.ts` at module top-level in
   a server component.
4. `next/headers`, `cookies()`, route handlers → server-only.

## Never...

1. Never write secret values — env var *names* only (two `NEXT_PUBLIC_*` secrets
   already exist and are tracked as High debt in `docs/DEBT.md`; do not add more).
2. Never commit `.env*`; never paste Supabase service-role key into client code —
   its only consumer (`createServiceClient`, `lib/supabase/server.ts:5`) is
   currently unused and must stay server-only.
3. Never bypass middleware protection: new private routes must be added to
   `protectedRoutes` in `lib/supabase/middleware.ts:30` AND the same PR updates
   `docs/ROUTES.md`.
4. Never fetch from `finflow-api` ad-hoc with raw `fetch` — extend
   `lib/api-client.ts` (it attaches the Bearer token, `:14-27`).
5. Never hardcode user-facing strings — add keys to `context/LanguageContext.tsx`
   for all three languages (`docs/CONVENTIONS.md#i18n`).
6. Never format dates with server/local timezone math for display or storage —
   IST helpers in `lib/utils.ts:23-128`.
7. Never edit `public/sw.js` without bumping `CACHE_NAME` (`public/sw.js:1`) and
   reading `docs/PWA.md#versioning`.
8. Never add a state library (Redux/Zustand) — React Context is the deliberate
   ceiling (`docs/DECISIONS.md`).

## Before changing code — checklist

1. Identify the layer: app page (client) / component / lib / config.
2. Check `docs/DEBT.md` — you may be touching a known-buggy area
   (e.g. localStorage mirror `lib/storage.ts`).
3. If touching auth/session: read `docs/AUTH.md` fully — three Supabase clients
   exist for three contexts.
4. New route? follow `skills/add-page.md`. New API call? `skills/add-api-call.md`.
5. Run `npm run lint` yourself — CI builds ignore lint and type errors.

## Pointers

| Task | Start at |
|---|---|
| Add a page | `skills/add-page.md` |
| Add a component | `skills/add-component.md` |
| Call the backend API | `skills/add-api-call.md` |
| Add/translate a string | `skills/add-translation.md` |
| Rotate a secret / add env var | `docs/SECRETS_MAP.md` + `.env.example` |
| Change DB tables/RLS | `docs/SCHEMA.md` + `supabase/migrations/` |
| Deploy / rollback | `docs/DEPLOYMENT.md` |
