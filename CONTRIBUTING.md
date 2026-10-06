# Contributing to finflow-frontend

## Setup

```bash
git clone https://github.com/Sadab-Munshi/finflow-frontend && cd finflow-frontend
npm install
cp .env.example .env.local   # fill values — names & purposes in docs/CONFIG.md
npm run dev                  # http://localhost:3000
```

Read first (humans and agents): `docs/AGENTS.md` → `docs/ARCHITECTURE.md` →
`docs/CONVENTIONS.md`.

## Scripts (`package.json:5-10`)

| Command | Purpose |
|---|---|
| `npm run dev` | dev server on port 3000 |
| `npm run lint` | ESLint (`next lint`) — **run it; builds skip it** |
| `npm run build` | production build (ignores lint + TS errors — `next.config.ts:4-9`) |
| `npx tsc --noEmit` | type gate you must run manually |
| `npm start` | serve the production build |

No test framework is configured; verify behavior manually against the checklists
in `skills/`.

## Task guides

- New route/page → `skills/add-page.md`
- New component → `skills/add-component.md`
- New backend API call → `skills/add-api-call.md`
- New user-facing string → `skills/add-translation.md`

## PR checklist

- [ ] `npm run lint` and `npx tsc --noEmit` pass (CI won't catch these).
- [ ] **New route → `docs/ROUTES.md` updated in the same PR** (+ `protectedRoutes`
      in `lib/supabase/middleware.ts:30` if private).
- [ ] **New env var → `docs/CONFIG.md` + `docs/SECRETS_MAP.md` + `.env.example`**
      in the same PR. Never a `NEXT_PUBLIC_` secret.
- [ ] **New user-facing string → all three languages in
      `context/LanguageContext.tsx`.**
- [ ] New external origin → CSP updated in `next.config.ts`.
- [ ] `public/sw.js` touched → `CACHE_NAME` bumped (`docs/PWA.md#versioning-rules`).
- [ ] Schema/RLS change → new SQL file in `supabase/migrations/` + `docs/SCHEMA.md`.
- [ ] Fixed something in `docs/DEBT.md`? Delete its row.
- [ ] No secrets, no `.env*`, no hardcoded external URLs in the diff.
- [ ] Mobile (360 px) and slow-network skeletons checked for UI changes.

## Branch & review flow

1. `git checkout -b feat/your-feature`
2. Small, single-purpose commits (docs alongside code).
3. Open a PR against `master`; describe behavior + link the doc rows you touched.
4. Squash-merge after review.
