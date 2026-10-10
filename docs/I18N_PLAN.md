---
name: i18n-plan
description: Step-by-step proposal for full internationalization of the FinFlow app with next-intl (Next.js App Router) — architecture decision, phased migration, risks, rollback
last_updated: 2026-10-10
audience: [human, agent]
related: [platform-controls, routes]
---

# i18n Implementation Plan (next-intl)

**Status: Phases 0–1 shipped on `feat/i18n-foundation` (2026-10-10).**
Approved decisions: cookie-based · app pages only in v1 · legal pages EN ·
LLM-drafted hi/bn · cookie-only (NEXT_LOCALE, max-age 1y).

Shipped: `i18n/config.ts` + `i18n/request.ts` (cookie → Accept-Language → en,
per-namespace en-fallback merge) · `messages/{en,hi,bn}/{common,nav,history,
transaction,budgets,insights,reports}.json` seeded from LanguageContext (140×3
keys parsed, real hi/bn translations carried over) · next-intl 4.14 plugin in
`next.config.ts` · root layout: `NextIntlClientProvider` + `<html lang>` (root
layout now dynamic — cookie read) · `global.d.ts` typed `IntlMessages` ·
`lib/i18n-cookie.ts` (`setLocaleCookie` + `router.refresh()` in profile) · all 8
`useLanguage` consumers migrated to `useTranslations` · `LanguageContext` deleted.
Note: `settings.language` DB column is no longer written (cookie-only v1) —
its value may be stale; ignore until a future sync phase.

## 1. Current state (audited)

- `context/LanguageContext.tsx`: 3 locales (en / hi / bn), ~140 inline keys,
  used in only **9 files**. Most UI copy is hardcoded English.
- A prior broad migration (`Replace hardcoded English strings with i18n t()
  calls across 20 files`) was **reverted twice** (`1bc7a16`, `ce6004a`).
  **Lesson for this plan: never again one giant diff — ship in small, separately
  committable phases, each independently verifiable and revertible.**
- Locale is chosen in Settings (`settings.language`) — not reflected in URLs.
- The app is a PWA: considerations for `sw.js` scope, push-notification click
  URLs, `start_url`, offline shell, and the `/auth/callback` handler.
- Public pages (landing, privacy, terms, …) are SEO-indexed with metadata,
  JsonLd and sitemap; auth pages (`login`, `signup`) are `noindex`.

## 2. Library decision

**next-intl** — the de-facto App Router standard.

| Criterion | next-intl | react-i18next | Lingui |
|---|---|---|---|
| Server Components | native | manual async init | macros |
| Routing integration | built-in (optional) | needs next-i18n-router | manual |
| Bundle weight | smallest of the full-feature set | ~25 KB w/ core | small, but needs macros/CLI |
| Type safety | typed message keys out of the box | via plugins | via extraction CLI |
| ICU plurals / interpolation | built-in | via icu plugin | built-in |
| Ecosystem fit | Next.js-only (fine for us) | framework-agnostic | extraction-centric |

Sources: [next-intl routing docs](https://next-intl.dev/docs/routing/setup),
[Weglot App Router i18n guide](https://www.weglot.com/blog/nextjs-internationalization),
[Dev.to 2026 comparison](https://dev.to/erayg/best-i18n-libraries-for-nextjs-react-react-native-in-2026-honest-comparison-3m8).

## 3. Architecture decision — locale WITHOUT URL routing

**Recommended: cookie-based locale (next-intl “without i18n routing”), with a
documented upgrade path to `[locale]` URL prefixes later.**

Why not URL prefixes (`/hi/dashboard`) on day one:

1. **Risk profile.** Moving all 23 pages under `app/[locale]/` touches middleware,
   auth callbacks, push click URLs, PWA `start_url`, the offline shell, sitemap and
   every `next/link` in the repo in a single release — exactly the failure shape of
   the reverted attempt.
2. **Fit.** Hi/Bn SEO discovery is nice-to-have; the core value is an app that works
   in the user's language. Auth pages are `noindex` already.
3. **Cookie mode is fully supported** by next-intl (locale resolved server-side in
   `i18n/request.ts` from `NEXT_LOCALE` cookie, falling back to `Accept-Language`)
   with zero public URL changes and identical message files. If we later flip to URL
   prefixes, only routing config changes — every `t()` call and JSON file is reused.

Trade-off (stated plainly): language is not encoded in URLs, so `/hi/` pages are not
independently crawlable; the sitemap stays English. Appendix A is the migration guide
to URL routing whenever we'll want per-locale SEO.

**Locale source of truth & sync:**
- Server: `i18n/request.ts` reads cookie `NEXT_LOCALE` → fallback `Accept-Language` → `en`.
- Client switcher (Settings): writes `settings.language` (kept) **and** sets the
  `NEXT_LOCALE` cookie (1y), then `router.refresh()` for a server re-render.
- First login on a fresh device: optional one-time sync — client effect compares
  `settings.language` vs cookie and updates the cookie (documented in P4).

## 4. Message file layout (per locale, per namespace)

```
messages/
  en/ {common,nav,dashboard,add,history,budgets,insights,reports,settings,profile,auth,onboarding,landing,notifications,errors}.json
  hi/ (same shape)      bn/ (same shape)
```

- **Seeding:** translate the existing ~140 LanguageContext keys into these JSON
  namespaces (hi/bn texts already exist — free first translations).
- **Nested keys**: `{ "empty": { "title": "…", "cta": "…" } }` with
  `useTranslations('dashboard')` per page block.
- **ICU syntax** for plurals/params: `"pending": "{count, plural, one {# transaction pending} other {# transactions pending}}"` —
  replaces today's string concatenation (`insights remaining`, `used` splicing).
- **Type safety**: `global.d.ts` augments `IntlMessages` from `messages/en`
  → invalid keys become **build-time errors** (this alone prevents the revert-class bug).
- **Fallbacks**: request config merges `en` under the active locale; a missing
  hi/bn key renders English, never a crash.

## 5. Phases (each = own commit + build + manual check)

**Phase 0 — Scaffolding (~small)**
`npm i next-intl` · `i18n/request.ts` + `i18n/config.ts` · `next.config` plugin ·
root layout: `NextIntlClientProvider` with server-loaded messages + `<html lang>`
from the resolved locale · `global.d.ts` typed messages · seed `common` + `nav`
namespaces ×3 locales from LanguageContext. **No UI changes yet.**

**Phase 1 — Core shell**
Migrate the 9 files already using `useLanguage()` to `useTranslations`
(nav/sidebar, layout chrome, notifications bell, skeletons, UpdateNotification).
Delete `LanguageProvider` from the tree at the end of this phase.
*Verify: nav labels switch instantly in all 3 languages; grep proves
`useLanguage` gone.*

**Phase 2 — App pages, one per commit**
Order (highest traffic first): dashboard → /add (4 input modes incl. parsers'
UI strings) → history (incl. filters/CSV headers) → budgets → insights →
reports → settings → profile (+ OnboardingModal, auth forms: labels,
placeholders, validation messages, toasts, SignupClosedCard).
Each: extract strings → `messages/*/page-ns.json` → replace with `t()` → build →
visual pass in hi & bn (Devanagari/Bengali line lengths!).

**Phase 3 — Public & transactional surfaces**
Landing page components · privacy/terms/support **copy stays English** in v1
(legal text translation is a policy call — flagged) · metadata via
`getTranslations` for login/signup/layout titles · OnboardingModal + auth flows ·
email-constrained strings (welcome/confirm handled server-side by Supabase
templates — **out of scope for next-intl; separate Supabase template settings**).

**Phase 4 — Formatting & polish**
Intl.NumberFormat for amounts (keep ₹ symbol; `hi-IN` digit grouping semantics
stay), date formatting where user-facing strings exist today ·
`dir="ltr"` (all 3 locales are LTR; attribute wired for future RTL) ·
settings↔cookie sync edge cases · delete `context/LanguageContext.tsx` ·
update `docs/` + CLAUDE.md conventions ("no string reaches JSX without `t()`").

**Phase 5 (optional, later) — URL-prefix routing upgrade. Appendix A.**

## 6. Testing strategy

- `getMessages`-coverage check: script diffing `en` vs `hi`/`bn` key sets (CI-safe).
- `tsc` catches unknown keys (Phase 0 typing).
- Manual matrix per phase: 3 locales × pages-in-phase; watch for overflow in
  Nav (Bengali words run long) and buttons.
- PWA regression pass: install prompt, offline shell, push click-through on an hi device.
- Snapshot the landing page in 3 locales before/after Phase 3.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Past big-bang migration failed | Phases ship independently; each commit is self-contained and revertible |
| Cookie vs SSR hydration mismatch | Locale resolved in root layout server-side; client switcher does `router.refresh()` — no client-only switch of SSR text |
| Toasts scattered across ~dozens of files | Grouped into `common`/`errors` namespaces, migrated with their page phase |
| AI-generated content (insights, report summaries) stays English | Documented limitation; `_locale` can be passed to the API later (out of scope v1) |
| Supabase email templates remain English | `NEXT_LOCALE` cookie can be read in `/auth/callback` later to pick a Supabase template variant (out of scope v1) |
| Bengali/Devanagari layout overflow | Visual pass in P2 checklist; `truncate`/`min-w-0` fixes as needed |

## 8. Effort estimate

| Phase | Size | Notes |
|---|---|---|
| 0 | ½ session | plumbing + seeds |
| 1 | ½ session | 9 files already wired |
| 2 | 2–3 sessions | the bulk; per-page commits |
| 3 | 1 session | landing + auth + metadata |
| 4 | ½ session | formats, cleanup, docs |

Rollback: revert the phase's commit; `en` fallbacks mean no page can break on
missing hi/bn keys.

## 9. Decisions I need from you (before Phase 0)

1. **Architecture**: cookie-based (recommended) vs `[locale]` URL prefixes from day one?
2. **Scope of hi/bn**: full app incl. landing, or app pages only (landing en-only for now)?
3. **Legal pages** (privacy/terms) — English-only in v1, yes?
4. **Translations**: are you happy with LLM-drafted hi/bn (reviewed by you/native speakers), or is a human translation source mandatory?
5. Keep the Settings language selector writing `settings.language` (kept for API parity) + cookie, or cookie-only?

## Appendix A — upgrade path to URL-prefix routing (`/hi/…`)

When desired: `app/` → `app/[locale]/` move · add `i18n/routing.ts`
(`defineRouting`, `localePrefix: 'as-needed'`) · next-intl `createMiddleware`
merged into `middleware.ts` matcher order (as documented; keep our auth/ban
checks after) · replace `next/link`/`next/navigation` imports with
`i18n/navigation` `Link/useRouter` exports · `generateStaticParams` per locale
for public pages · `alternates.languages` in `generateMetadata` (hreflang) +
sitemap entries ×3 · `setRequestLocale` for static rendering · repoint push
click URLs + `start_url`. Estimate: one focused session. All `t()` calls and
message files carry over unchanged.
