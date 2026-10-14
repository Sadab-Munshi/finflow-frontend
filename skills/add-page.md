---
name: skill-add-page
description: Checklist — add a new route/page to finflow-frontend
last_updated: 2026-10-06
audience: [agent]
related: [agents, routes, conventions]
---

# Skill: Add a Page

## Inputs
- URL path (kebab-case) + which group: public `(landing)`/`(auth)` or app page
- Auth level: middleware-protected / public
- Data source: Supabase table(s) and/or finflow-api endpoint(s)

## Steps
1. Pick the pattern by page type:
   - **App page** (interactive): client `page.tsx` + sibling domain skeleton +
     `loading.tsx` — copy `app/insights/page.tsx` + `components/skeletons/InsightsSkeleton.tsx` + `app/insights/loading.tsx`.
   - **Public/SEO page**: server `page.tsx` with `export const metadata`
     rendering a client `*Content.tsx` — copy `app/(landing)/support/page.tsx`.
     (No admin pages here — admin lives on a separate domain since 2026-10-06.)
2. `mkdir app/<path>` and create the files; use the `@/` import alias
   (`app/dashboard/page.tsx:20`).
3. If the path is private: add it to `protectedRoutes`
   (`lib/supabase/middleware.ts:30`) — same PR, no exceptions (invariant #2,
   `docs/ARCHITECTURE.md`).
4. Data: own-user rows → `lib/db.ts` call in a `useEffect`; privileged/AI →
   `skills/add-api-call.md`. Never fetch directly from the API with raw `fetch`.
5. Strings: add all user-visible text to `context/LanguageContext.tsx` en/hi/bn
   (`skills/add-translation.md`).
6. SEO (public pages only): metadata in the server page, add URL to
   `app/sitemap.ts`, mind the canonical-host note in `docs/SEO.md`.
7. Wire navigation in `components/layout/Layout.tsx` only if it belongs in the
   main nav (most app pages live there).
8. Docs: add the row to `docs/ROUTES.md` (path, file, auth, rendering, notes)
   and the loading mapping if you created `loading.tsx`.

## Verify
- `npm run lint` and `npx tsc --noEmit` (builds ignore both — check explicitly).
- Logged-out visit to a private path → 307 to `/login` (check middleware).
- Loading skeleton flashes on slow network (DevTools throttling).
- Language switch renders hi/bn without raw keys showing.

## Common mistakes
- Forgetting the middleware list → "protected" page renders for anyone.
- `metadata` exported from a client component (silently ignored).
- Raw `fetch` with a hand-built Authorization header (bypasses token refresh;
  use api-client).
- New skeleton without a matching `loading.tsx` (or vice versa).
- English-only strings (hi/bn show the key itself — fallback is `:179` in
  LanguageContext).
