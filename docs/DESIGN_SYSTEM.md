---
name: design-system
description: Styling system — Tailwind v4 tokens, shadcn/ui primitives, cva variants, signature teal, cn()
last_updated: 2026-10-06
audience: [human, agent]
related: [conventions, architecture]
---

# Design System

## Stack

Tailwind CSS **v4** (CSS-first config — no `tailwind.config.*`),
`@tailwindcss/postcss` (`postcss.config.mjs`), `tw-animate-css` animations,
and shadcn/ui ("new-york" style, `components.json:3-4`) on Radix primitives.

## Token source: `app/globals.css`

- Imports: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css` (`:1-3`).
- Dark mode variant registered as class strategy: `@custom-variant dark
  (&:is(.dark *))` (`:5`) — toggle by adding `.dark` to a wrapper; there is no
  ThemeProvider today (app is light-first). <!-- TODO: verify whether dark mode is exposed anywhere in settings -->
- `@theme inline` maps shadcn CSS vars to Tailwind color tokens
  (`background/foreground/sidebar-*/chart-1..5/ring/input/border/destructive/
  accent/muted/…`, `globals.css:7-32+`) — **extend tokens here, not ad-hoc**.

## Accent language

Brand teal `#0d9488` (same as PWA theme color, `app/layout.tsx:18` and
`site.webmanifest`) used via `bg-teal-600/700`, gradients
`from-teal-600 to-teal-700`, and soft tinted surfaces
(`bg-gradient-to-br from-teal-50/40 via-white to-amber-50/30`,
`components/layout/Layout.tsx:113`). Reuse these scales; don't introduce a
second accent color.

## Primitives (`components/ui/`)

Radix-wrapped: `button`, `card`, `dialog`, `alert-dialog`, `select`, `switch`,
`checkbox`, `tabs`, `input` (+ `InstallPrompt`, `LoadingScreen`).

- Variants via `class-variance-authority` — canonical:
  `buttonVariants` (`components/ui/button.tsx:7-36`), consumed as
  `<Button variant="default|destructive|outline|secondary|ghost|link"
  size="default|sm|lg|icon">`.
- Class merging everywhere via `cn()` (`@/lib/utils` — `clsx` +
  `tailwind-merge`): pass overrides through the `className` prop rather than
  editing the primitive.

## App-shell structure

`components/layout/Layout.tsx` — fixed sidebar (desktop) + floating
rounded-full mobile menu button (`:125`) + header avatar from `useUser()`.
Domain pages compose inside it; screens disable it where chrome-free
(auth/landing).

## Iconography & motion

- Icons: `lucide-react` only (tree-shaken via `optimizePackageImports`,
  `next.config.ts:11-22`).
- Motion: `framer-motion` for page/card transitions; `tw-animate-css` utilities
  for micro-interactions; three.js is quarantined to
  `app/add/components/ParticleSphere.tsx` (decorative).

## Density & type

- Font: Inter via `next/font` (`display: swap`, `app/layout.tsx:21`).
- Mobile-first; the app targets phone PWA usage — test at 360 px first.
- Tables/lists use small text (`text-xs/sm`) with `tabular-nums` for amounts
  via the INR formatting helpers in `lib/utils.ts`.

## Do / don't

| Do | Don't |
|---|---|
| Extend `@theme` tokens in `globals.css` | hardcode hex in many components |
| `cva` for component variants | string-concat conditional classes by hand (use `cn`) |
| `lucide-react` icons | new icon libraries / inline SVG duplicating lucide |
| reuse `components/ui/*` | fork a primitive for a one-off style (wrap it instead) |
