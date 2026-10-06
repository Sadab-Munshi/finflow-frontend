---
name: skill-add-component
description: Checklist — add a component (ui primitive, domain component, or skeleton)
last_updated: 2026-10-06
audience: [agent]
related: [agents, conventions, design-system]
---

# Skill: Add a Component

## Inputs
- Domain: `auth/`, `ui/`, `skeletons/`, `analytics/`, `notifications/`, `layout/`,
  `landing/`, or feature-local (e.g. `app/add/components/`)
- Interactivity (decides `'use client'`), props interface
- i18n strings needed

## Steps
1. Choose the home:
   - generic primitive → `components/ui/` (must stay app-agnostic; Radix-based;
     adhere to `components.json` shadcn conventions `"new-york"`)
   - domain piece → `components/<domain>/`
   - page-specific → colocate in the route folder (`app/add/components/ScanTab.tsx`).
2. Server-first: omit `'use client'` unless you need state/effects/handlers —
   put the directive at line 1 exactly (`context/UserContext.tsx:1`).
3. Props interface above the component; export one default per file
   (`components/auth/LoginForm.tsx`).
4. Style with Tailwind tokens only (`docs/DESIGN_SYSTEM.md`); merge consumer
   classes through `className` + `cn()` from `@/lib/utils`.
5. Variants via `cva` when 2+ visual modes — copy `components/ui/button.tsx:7-36`.
6. Strings come from `useLanguage().t` (client) — never hardcode
   (`skills/add-translation.md`).
7. Heavy deps (three.js/pdf): dynamic `import()` inside handlers, or
   `next/dynamic` for components (`app/layout.tsx:13-15`).
8. Skeletons: if the component replaces content during loading, add the matching
   skeleton in `components/skeletons/` mirroring layout sizes 1:1.
9. Docs: update `docs/ARCHITECTURE.md` feature table if the component defines a
   feature surface; DESIGN_SYSTEM.md if it introduces a new pattern.

## Verify
- No hydration errors in dev console (mind `localStorage`/window access — guard
  it like `context/LanguageContext.tsx:170-171`).
- 360 px viewport render passes (mobile-first PWA).
- `cn()` merges consumer overrides without specificity fights.

## Common mistakes
- Importing `next/headers` libs (e.g. `lib/supabase/server.ts`) into a client
  component — build breaks.
- Editing a `components/ui/` primitive for a one-off (wrap it instead).
- `any` props — extend `lib/types.ts` instead.
- Hardcoded hex colors instead of teal tokens/`bg-primary` families.
