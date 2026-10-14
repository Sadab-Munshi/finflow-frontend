---
name: seo
description: SEO surface — metadata, sitemap/robots, JSON-LD, canonical host, indexability of protected pages
last_updated: 2026-10-06
audience: [human, agent]
related: [routes, deployment, pwa]
---

# SEO

## Canonical host — one inconsistency to know

`metadataBase` is `https://www.app.sadabmunshi.me` (`app/layout.tsx:31`) and all
sitemap URLs use the `www.` host (`app/sitemap.ts:6,12,18`) — but
`public/robots.txt:4` advertises `https://app.sadabmunshi.me/sitemap.xml` and
og/twitter URLs also use `www.` (`app/layout.tsx:50`). **Pick one host** (the
`www.` form appears authoritative in code) and align robots + Vercel domain
redirects; tracked in `docs/DEBT.md`. <!-- TODO: verify which host the Vercel project actually serves/redirects -->

## Metadata

- Root template `%s | FinFlow` + description/keywords/OG/Twitter/apple blocks:
  `app/layout.tsx:23-102`.
- Per-page titles on public pages: landing (`app/(landing)/page.tsx`), login,
  signup — auth pages keep metadata on the server shell (reason client
  `LoginContent` exists).
- Icons + manifest wiring: `app/layout.tsx:70,91-101`.

## Sitemap & robots

- `app/sitemap.ts` emits 8 entries (`:4-31`): `/`, `/login`, `/signup` plus the
  five public marketing/legal pages (`/terms`, `/privacy`, `/disclaimer`,
  `/support`, `/user-guide`, appended at `:23-29`, priority 0.3) — expanded
  2026-10-06.
- `public/robots.txt`: `Allow: /` + sitemap line. No `Disallow` — protected
  routes are effectively un-indexable anyway because middleware 307s crawlers
  to `/login` (bot likely has no session); don't add app routes to the sitemap.
- `middleware.ts:10` excludes `sitemap.xml`/`robots.txt`/OG images from the
  middleware matcher so crawlers fetch them unauthed.

## Structured data (`components/JsonLd.tsx`)

`WebsiteJsonLd` + `OrganizationJsonLd` rendered in root `<head>`
(`app/layout.tsx:113-114` inline before children). Keep URLs consistent with
the canonical host decision above.

## Performance budget that SEO depends on

- `optimizePackageImports` for lucide/recharts/framer/radix (`next.config.ts:11-22`).
- Vendor split: three/recharts/framer out of the main chunk
  (`next.config.ts:38-84`); three.js only behind the `/add` particle
  component.
- Fonts: `Inter` via `next/font` with `display: swap` (`app/layout.tsx:21`).
- `next/image` for Supabase storage only (remotePatterns,
  `next.config.ts:24-32`), 1-week min cache, AVIF/WebP (`:33-36`).
- Static images feature `Cache-Control: immutable` (`next.config.ts:123-164`).

## Verification loop after changes

1. `view-source:` of `/` — meta + JSON-LD present.
2. `curl -s https://<host>/sitemap.xml` and `/robots.txt`.
3. Rich Results Test for JSON-LD; PageSpeed Insights for LCP/INP.
