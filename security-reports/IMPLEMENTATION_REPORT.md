# FinFlow Frontend — Security Remediation, TypeScript/ESLint Cleanup & Performance Optimization Report

- **Repository:** `/home/user/finflow-frontend` (`https://github.com/Sadab-Munshi/finflow-frontend.git`)
- **Branch:** `feat/youpi-pg-integration`
- **Date:** 2026-10-21
- **Baseline Audit Reference:** `security-reports/SECURITY_AUDIT.md`

---

## 1. Executive Summary

We executed a full, staged remediation of the security findings in `security-reports/SECURITY_AUDIT.md`, resolved **all 16 TypeScript compiler errors** and **all 80 ESLint problems (`51 errors`, `29 warnings`)**, re-enabled strict build-time TypeScript and ESLint gates in `next.config.ts`, and performed targeted bundle and Core Web Vitals optimizations across the application.

### Headline Outcomes (Before vs. After)

| Area | Metric | Before (Baseline) | After (Verified) | Delta |
|---|---|---:|---:|---:|
| **Supply-Chain Security** | `npm audit --omit=dev` (Production Vulns) | **41** (`4 Critical`, `20 High`, `15 Mod`, `2 Low`) | **0** (`0 Critical`, `0 High`, `0 Mod`, `0 Low`) | **-100%** |
| **Supply-Chain Security** | `npm audit` (All incl. Dev) | **49** (`4 Critical`, `26 High`, `17 Mod`, `2 Low`) | **8** (`0 Critical`, `8 High` dev-only in `eslint`/`shadcn`) | **-83.7%** |
| **Supply-Chain Security** | `osv-scanner` Advisories | **35 advisories** across 12 packages | **1 advisory** (dev-only `braces@3.0.3` in `eslint`) | **-97.1%** |
| **Static Analysis (SAST)** | `semgrep` (`typescript`, `react`, `nextjs`, `owasp-top-ten`) | Multiple open-redirect / unsafe patterns | **0 findings** across 143 files | **Clean** |
| **Type Safety** | `npx tsc --noEmit` | **16 errors** (`ignoreBuildErrors: true`) | **0 errors** (enforced during `next build`) | **-100%** |
| **Code Quality** | `npm run lint` (`next lint`) | **80 problems** (`51 errors`, `29 warnings`) | **0 errors, 0 warnings** (enforced during `next build`) | **-100%** |
| **Automated Tests** | `npm test` (`node --test`) | **6 passing** | **10 passing, 0 failing** | **+4 security suites** |
| **Bundle Size** | Landing Page (`/`) First Load JS | **194 kB** | **128 kB** | **-66 kB (-34.0%)** |
| **Bundle Size** | Login (`/login`) First Load JS | **327 kB** | **223 kB** | **-104 kB (-31.8%)** |
| **Bundle Size** | Analytics (`/analytics`) First Load JS | **482 kB** | **233 kB** | **-249 kB (-51.7%)** |
| **Bundle Size** | Dashboard (`/dashboard`) First Load JS | **488 kB** | **347 kB** | **-141 kB (-28.9%)** |
| **Bundle Size** | History (`/history`) First Load JS | **412 kB** | **271 kB** | **-141 kB (-34.2%)** |
| **Core Web Vitals (`/`)** | Lighthouse Perf / A11y / BP / SEO | **77 / 90 / 96 / 100** | **84 / 100 / 96 / 100** | **+7 Perf, +10 A11y** |
| **Core Web Vitals (`/login`)** | Lighthouse Perf / A11y / BP / SEO | **0 (`NO_LCP`) / 91 / 96 / 66** | **84 / 100 / 96 / 66** | **+84 Perf, +9 A11y** |

---

## 2. Security Fixes Applied

Every finding from `security-reports/SECURITY_AUDIT.md` was validated in the codebase and remediated as follows:

| ID | Severity | Finding | Status | Implementation & Files Modified |
|---|---|---|---|---|
| **CRIT-01** | Critical | Vulnerable `next@15.2.3` (`GHSA-f82v-jwr5-mffw` CVSS 9.1 middleware auth bypass + 12 advisories) | **Fixed** | Upgraded `next` to **`15.5.28`** (`package.json`, `package-lock.json`). Verified `next@15.5.28` compiles and passes all 31 static/dynamic routes. |
| **CRIT-02** | Critical | Vulnerable `jspdf@2.5.2` (`GHSA-f8cm-6447-x5h2`, `GHSA-9vjf-QC39-jprp` PDF object injection / XSS + 7 advisories) | **Fixed** | Upgraded `jspdf` to **`4.2.1`**, removed deprecated `@types/jspdf`, and sanitized all user-controlled fields (`note`, `category`, `date`) via `sanitizePdfText()` in `lib/security.ts`, `app/history/page.tsx`, and `app/backup-restore/page.tsx`. |
| **CRIT-03** | Critical | Vulnerable transitive `protobufjs@7.5.4` (`GHSA-xq3m-2v4x-88gg` arbitrary code execution) & `flatted` (`GHSA-25h7-pfq9-p65f` prototype pollution) | **Fixed** | Removed unused 3D/WebGL packages (`three`, `@react-three/fiber`, `@react-three/drei`) and dead `app/add/components/ParticleSphere.tsx`, and pinned patched `flatted@^3.4.2`, `yaml@^2.8.3`, `brace-expansion@^1.1.13`, `picomatch@^2.3.2` via `overrides` in `package.json`. |
| **HIGH-01** | High | Open Redirects in OAuth Callback (`app/auth/callback/route.ts`), Auth Completion (`app/auth/complete/page.tsx`), and Notification Links (`NotificationCenter.tsx`, `NotificationBell.tsx`, `app/notifications/page.tsx`) | **Fixed** | Implemented `sanitizeInternalRedirect(next, fallback)` in `lib/security.ts` (blocking `//evil.com`, `/\evil.com`, `https://`, `javascript:`, `data:`, and CRLF characters) and enforced it across `app/auth/callback/route.ts`, `app/auth/complete/page.tsx`, `components/notifications/NotificationCenter.tsx`, `components/notifications/NotificationBell.tsx`, and `app/notifications/page.tsx`. Also constrained notification icon filenames to `/^[a-zA-Z0-9_-]+\.png$/`. |
| **HIGH-02** | High | Unrestricted Avatar Upload (`image/*` including `image/svg+xml` stored XSS & oversized files) | **Fixed** | Implemented `validateAvatarFile()` in `lib/security.ts` enforcing a strict `{ image/jpeg, image/png, image/webp }` MIME + `{ .jpg, .jpeg, .png, .webp }` extension allowlist and a `2 MB` size limit. Applied in `app/profile/page.tsx` with explicit `contentType` and canonical extension. Added `settings_avatar_url_https_chk` in `supabase/migrations/014_security_hardening_rls.sql`. |
| **HIGH-03** | High | Hardcoded Demo Credentials in `LoginForm.tsx` & Client-Only Signup Gate Bypass | **Fixed** | Removed hardcoded demo email/password from `components/auth/LoginForm.tsx` and gated the demo fill button behind `NEXT_PUBLIC_DEMO_EMAIL` and `NEXT_PUBLIC_DEMO_PASSWORD`. Added database-level `registration_mode` and `allowed_email_domains` checks to `public.enforce_signup_limit()` in `supabase/migrations/014_security_hardening_rls.sql`. |
| **HIGH-04** | High | Service Worker Caching of Authenticated Pages & Incomplete Sign-Out Cleanup | **Fixed** | Upgraded `public/sw.js` (`finflow-v2`) to strictly exclude `/api/*`, `/auth/*`, `/_next/data/*`, and all authenticated routes (`/dashboard`, `/history`, `/budgets`, `/insights`, `/analytics`, `/reports`, `/subscription`, `/settings`, `/profile`, `/notifications`, `/add`, `/transaction`, `/backup-restore`, `/privacy-security`) from `CacheStorage`, and added a `CLEAR_AUTH_CACHE` message handler. Excluded `/sw.js` from `middleware.ts` redirect interception. Updated `app/dashboard/SignOutButton.tsx`, `app/profile/page.tsx`, `components/layout/Layout.tsx`, and `components/auth/AuthListener.tsx` to perform global `supabase.auth.signOut()`, `clearClientSecurityState()`, and `resetAnalytics()`. Scoped `notificationsCache` by `userId` in `NotificationBell.tsx`. |
| **MED-01** | Medium | Overly Permissive Content Security Policy (`blob:` in `script-src`, wildcard `img-src https:`, missing `base-uri`/`form-action`/`frame-ancestors`/`object-src`) | **Fixed** | Hardened `Content-Security-Policy` in `next.config.ts`: removed `blob:` from `script-src`, restricted `img-src` and `connect-src` to explicit trusted origins (`*.supabase.co`, `lh3.googleusercontent.com`, `avatars.githubusercontent.com`, `pay.sadabmunshi.me`, `api.sadabmunshi.me`, PostHog, Cloudflare Turnstile), added `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, and `Cross-Origin-Opener-Policy: same-origin-allow-popups`. Removed inline SW registration `<script>` from `app/layout.tsx`. |
| **MED-02** | Medium | CSV Formula Injection (`CWE-1236`) in Transaction & Backup Exports | **Fixed** | Implemented `sanitizeCsvCell()` in `lib/security.ts` (prefixing non-numeric cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` with `'` and escaping quotes) and applied it to all CSV exports in `app/history/page.tsx` and `app/backup-restore/page.tsx`. |
| **MED-03** | Medium | Production Exposure of ₹1 Test Pass via `?testMode=1` Query Parameter | **Fixed** | Gated `?testMode=1` in `app/subscription/page.tsx` behind `process.env.NEXT_PUBLIC_ENABLE_TEST_PASS === 'true'` so unprivileged users cannot unlock `test_1inr` via URL manipulation. |
| **MED-04** | Medium | Third-Party IP Leakage (`api.ipify.org`) & Spoofable `x-forwarded-for` Header | **Fixed** | Removed the unauthenticated `https://api.ipify.org` fetch from `context/UserContext.tsx` and removed client-supplied `ip` / `x-forwarded-for` spoofing from `lib/api-client.ts` (backend reads socket/proxy IP directly). |
| **MED-05** | Medium | Unvalidated Dynamic Payment SDK Script URL (`lib/youpi-checkout.ts`) | **Fixed** | Added `getAllowedPaymentOrigins()`, `resolvePortalOrigin()`, and `normalizeCheckoutUrl()` in `lib/youpi-checkout.ts` enforcing an HTTPS origin allowlist (`https://pay.sadabmunshi.me` + valid HTTPS `NEXT_PUBLIC_YOUPI_CHECKOUT_URL`) and setting `crossOrigin = 'anonymous'` on the SDK `<script>` element. |
| **MED-06** | Medium | Vulnerable Transitive Dependencies in `posthog-js`, `@supabase/ssr`, and `Rollup`/`Vite` | **Fixed** | Upgraded `posthog-js` to `^1.438.13`, `@supabase/ssr` to `^0.9.0`, and `@supabase/supabase-js` to `^2.99.3`. |
| **LOW-01** | Low | `ignoreBuildErrors: true` & `ignoreDuringBuilds: true` in `next.config.ts` | **Fixed** | Fixed all 16 TypeScript errors and all 80 ESLint problems, and removed `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` from `next.config.ts`. |
| **LOW-02** | Low | Missing `Secure` Attribute on `NEXT_LOCALE` Cookie (`lib/i18n-cookie.ts`) | **Fixed** | Appended `; Secure` automatically when `window.location.protocol === 'https:'` in `lib/i18n-cookie.ts`. |
| **LOW-03** | Low | Missing `.eq('user_id', user.id)` Defense-in-Depth Filters & RLS `WITH CHECK` Clauses | **Fixed** | Added explicit `.eq('user_id', user.id)` and field whitelisting in `lib/db.ts` (`updateTransaction`, `deleteTransaction`, `deleteTransactions`, `updateBudget`, `deleteBudget`) and `components/notifications/NotificationBell.tsx`, plus explicit `WITH CHECK (auth.uid() = user_id)` policies in `supabase/migrations/014_security_hardening_rls.sql`. |
| **LOW-04** | Low | Legacy Domain (`app.sadabmunshi.online`) in Supabase Email Templates | **Fixed** | Updated `supabase/email-templates/{confirm-signup,invite,magic-link,reset-password}.html` to `https://www.app.sadabmunshi.me`. |
| **LOW-05** | Low | Internal Infrastructure Reference in Documentation | **Verified** | Confirmed `REPORT_RATE_LIMITING.md` is already removed from the repository working tree. |

---

## 3. TypeScript and ESLint Fixes

### 3.1 TypeScript (`npx tsc --noEmit`: `16 errors` → `0 errors`)
1. **`lib/supabase/server.ts` & `lib/supabase/middleware.ts` & `lib/supabase/client.ts`**:
   - Updated `@supabase/ssr` (`^0.9.0`) cookie adapter signatures (`cookiesToSet: { name: string; value: string; options: CookieOptions }[]`) and typed `createClient(): SupabaseClient` in `lib/supabase/client.ts`.
2. **`context/UserContext.tsx` (`TS2345`)**:
   - Guarded `session.user.email` before calling `identifyUser(session.user.id, session.user.email)`.
3. **`lib/storage.ts` (`TS2322`, `TS2345`)**:
   - Explicitly typed `getSettings()` return payload and normalized `updated_at` (`string | undefined` → `string | null`) to satisfy `UserSettings`.

### 3.2 ESLint (`npm run lint`: `51 errors, 29 warnings` → `0 errors, 0 warnings`)
- **`@typescript-eslint/no-explicit-any` (20 errors fixed)**:
  - Replaced all `any` casts with strict TypeScript interfaces in `app/subscription/page.tsx`, `app/subscription/payments/page.tsx`, `lib/subscription-utils.ts`, `app/analytics/page.tsx`, `app/insights/page.tsx`, `components/ui/InstallPrompt.tsx`, and `components/landing/reactbits/BlurText.tsx`.
- **`react-hooks/set-state-in-effect` & `react-hooks/immutability` & `react-hooks/purity` (16 errors fixed)**:
  - Refactored `app/add/components/VoiceTab.tsx` (declared `handleVoiceStop` before effect and tracked elapsed recording seconds via `useRef` instead of cascading state), `components/auth/SignupForm.tsx`, `components/layout/Layout.tsx`, `components/landing/reactbits/BlurText.tsx`, `app/analytics/page.tsx`, `app/budgets/page.tsx`, `app/insights/page.tsx`, `app/privacy-security/page.tsx`, `app/subscription/page.tsx`, `app/subscription/payments/page.tsx`, `components/notifications/NotificationBell.tsx`, and `components/ui/InstallPrompt.tsx`.
- **`react-hooks/static-components` (4 errors fixed)**:
  - Extracted `AvatarCircle` and `ProfileSkeleton` out of `Layout` render body into top-level components in `components/layout/Layout.tsx`.
- **`react/no-unescaped-entities` (11 errors fixed)**:
  - Escaped raw apostrophes/quotes in `app/(auth)/forgot-password/page.tsx`, `app/notifications/page.tsx`, and `components/PlatformGate.tsx`.
- **`@next/next/no-img-element`, `@typescript-eslint/no-unused-vars`, and `react-hooks/exhaustive-deps` (29 warnings fixed)**:
  - Replaced `<img>` with `next/image` in `NotificationCenter.tsx` and `app/notifications/page.tsx`, and cleaned up all unused imports/variables across `app/profile/page.tsx`, `app/(landing)/user-guide/UserGuideContent.tsx`, `app/add/components/ManualTab.tsx`, `app/add/hooks/useTransaction.tsx`, `app/settings/page.tsx`, `components/landing/MotionLoops.tsx`, and `components/analytics/SeasonalityChart.tsx`.

---

## 4. Performance and Core Web Vitals Optimizations

### 4.1 Key Architectural Optimizations Implemented
1. **Removed Unimported 3D/WebGL Stack & Dead Dependencies**:
   - Removed `app/add/components/ParticleSphere.tsx` and uninstalled `three`, `@react-three/fiber`, `@react-three/drei`, `html2canvas`, and `uuid`.
2. **Eliminated `framer-motion` from the Shared Authenticated `Layout` (`components/layout/Layout.tsx`)**:
   - Replaced `AnimatePresence` and `motion.div` in `Layout.tsx` with lightweight CSS transitions and removed the `<motion.div initial={{ opacity: 0 }}>` wrapper around `<main>`, saving **104 kB – 141 kB of First Load JS across every authenticated route**.
3. **Code-Split Heavy Analytics Charts (`app/analytics/page.tsx`) & Configured `optimizePackageImports`**:
   - Dynamically imported `RollingAveragesChart`, `SeasonalityChart`, `AnomalyList`, and `YoYComparison` (`next/dynamic`) and added `optimizePackageImports` in `next.config.ts`, cutting `/analytics` First Load JS from **482 kB to 233 kB (`-51.7%`)**.
4. **Deferred `posthog-js`, `PlatformGate`, and Service Worker Registration Until Browser Idle**:
   - Converted `lib/posthog.ts` to lazy-load `posthog-js` via dynamic `import('posthog-js')` inside `requestIdleCallback`.
   - Fixed a critical first-visit reload bug in `components/UpdateNotification.tsx` where `navigator.serviceWorker.addEventListener('controllerchange', ...)` triggered `window.location.reload()` when `/sw.js` claimed clients on first visit (`hadController === false`), and deferred `/sw.js` registration until idle.
5. **Eliminated Blocking Client-Side Auth & IP Waterfalls**:
   - Added a fast-path in `lib/supabase/middleware.ts`, `context/UserContext.tsx`, and `app/(landing)/HomeContent.tsx` to skip Supabase network auth calls and dynamically import `@/lib/supabase/client` on public routes when no `sb-` session cookie is present (cutting `/` First Load JS from **194 kB to 128 kB**).
   - Parallelized `supabase.auth.getUser()`, `getSettings()`, and `getSubscriptionStatus()` via `Promise.all` in `context/UserContext.tsx` and `app/profile/page.tsx`.
6. **Resolved `/login` SSR Suspense Bailout & LCP Opacity Issues**:
   - Moved `useSearchParams()` in `app/(auth)/login/LoginContent.tsx` into an isolated `<LoginStatusBanners />` child component inside `<Suspense>` so `<AuthShell>` and `<LoginForm>` render in the initial SSR HTML instead of falling back to `"Loading..."`.
   - Updated `BlurText.tsx` and `@keyframes auth-fade-up` in `app/globals.css` so hero headings render at visible opacity on first SSR paint.

### 4.2 Route-by-Route First Load JS Comparison (`next build`)

| Route | Baseline First Load JS | After First Load JS | Reduction | % Saved |
|---|---:|---:|---:|---:|
| `/` (Landing Page) | 194 kB | **128 kB** | **-66 kB** | **-34.0%** |
| `/login` | 327 kB | **223 kB** | **-104 kB** | **-31.8%** |
| `/signup` | 329 kB | **224 kB** | **-105 kB** | **-31.9%** |
| `/analytics` | 482 kB | **233 kB** | **-249 kB** | **-51.7%** |
| `/dashboard` | 488 kB | **347 kB** | **-141 kB** | **-28.9%** |
| `/history` | 412 kB | **271 kB** | **-141 kB** | **-34.2%** |
| `/subscription` | 390 kB | **249 kB** | **-141 kB** | **-36.2%** |
| `/subscription/payments` | 380 kB | **239 kB** | **-141 kB** | **-37.1%** |
| `/profile` | 380 kB | **239 kB** | **-141 kB** | **-37.1%** |
| `/insights` | 377 kB | **236 kB** | **-141 kB** | **-37.4%** |
| `/backup-restore` | 375 kB | **235 kB** | **-140 kB** | **-37.3%** |
| `/privacy-security` | 372 kB | **231 kB** | **-141 kB** | **-37.9%** |
| `/reports` | 371 kB | **230 kB** | **-141 kB** | **-38.0%** |
| `/settings` | 391 kB | **286 kB** | **-105 kB** | **-26.9%** |
| `/add` | 384 kB | **280 kB** | **-104 kB** | **-27.1%** |
| `/budgets` | 379 kB | **274 kB** | **-105 kB** | **-27.7%** |
| `/user-guide` | 224 kB | **119 kB** | **-105 kB** | **-46.9%** |
| `/support` | 221 kB | **117 kB** | **-104 kB** | **-47.1%** |
| `/privacy`, `/terms`, `/disclaimer` | 208 kB | **104 kB** | **-104 kB** | **-50.0%** |

### 4.3 Lighthouse Core Web Vitals Comparison (Headless Chromium Against Production `next start`)

| Route & Metric | Baseline | After | Change |
|---|---:|---:|---:|
| **`/` — Performance Score** | 77 | **84** | **+7 pts** |
| **`/` — Accessibility Score** | 90 | **100** | **+10 pts (Perfect)** |
| **`/` — Best Practices Score** | 96 | **96** | **0** |
| **`/` — SEO Score** | 100 | **100** | **Perfect** |
| **`/` — Largest Contentful Paint (LCP)** | 3.8 s | **3.5 s** | **-300 ms** |
| **`/` — Total Blocking Time (TBT)** | 430 ms | **300 ms** | **-130 ms (-30.2%)** |
| **`/` — Time to Interactive (TTI)** | 5.1 s | **4.2 s** | **-900 ms (-17.6%)** |
| **`/` — Cumulative Layout Shift (CLS)** | 0 | **0** | **0 (Perfect)** |
| **`/` — JS Bootup Time** | 1.0 s | **0.7 s** | **-300 ms (-30.0%)** |
| **`/` — Total Transfer Size** | 557 KiB | **479 KiB** | **-78 KiB (-14.0%)** |
| **`/` — Unused JavaScript** | 132 KiB | **42 KiB** | **-90 KiB (-68.2%)** |
| **`/login` — Performance Score** | 0 (`NO_LCP`) / 65 | **84** | **+84 pts / +19 pts** |
| **`/login` — Accessibility Score** | 91 | **100** | **+9 pts (Perfect)** |
| **`/login` — Best Practices Score** | 96 | **96** | **0** |
| **`/login` — First Contentful Paint (FCP)** | 1.4 s | **1.1 s** | **-300 ms (-21.4%)** |
| **`/login` — Largest Contentful Paint (LCP)** | `NO_LCP` (failed) | **3.0 s** | **Resolved** |
| **`/login` — Speed Index (SI)** | 1.4 s | **1.1 s** | **-300 ms (-21.4%)** |
| **`/login` — JS Bootup Time** | 1.7 s | **0.6 s** | **-1.1 s (-64.7%)** |
| **`/login` — Total Transfer Size** | 548 KiB | **414 KiB** | **-134 KiB (-24.5%)** |

---

## 5. Verification Results

All verification commands were executed in `/home/user/finflow-frontend` and saved under `security-reports/`:

1. **TypeScript Type Check (`npx tsc --noEmit`)**:
   - Exit code: `0` (`0 errors`, `security-reports/after-tsc.txt`)
2. **ESLint Check (`npm run lint`)**:
   - Output: `✔ No ESLint warnings or errors` (`security-reports/after-eslint.txt`)
3. **Unit & Security Regression Tests (`npm test`)**:
   - Output: `10 passing, 0 failing` (`__tests__/security-hardening.test.mjs` and `__tests__/subscription-redesign.test.mjs`, `security-reports/after-test.txt`)
4. **Production Build (`npm run build`)**:
   - Exit code: `0` — compiled all 31 static & dynamic routes with build-time ESLint and TypeScript validation active (`security-reports/after-build.txt`).
5. **Security Scanners**:
   - `npm audit --omit=dev`: `0 vulnerabilities` (`security-reports/after-npm-audit-prod.json`)
   - `osv-scanner --lockfile=package-lock.json`: `0 runtime advisories` (`1` dev-only `braces@3.0.3` advisory in `eslint`, `security-reports/after-osv.json`)
   - `semgrep scan --config=p/typescript --config=p/react --config=p/nextjs --config=p/owasp-top-ten`: `0 findings` across 143 files (`security-reports/after-semgrep.json`)

---

## 6. Remaining Risks & Recommendations

1. **Apply Database Migration `014_security_hardening_rls.sql` in Production Supabase**:
   - Run `supabase/migrations/014_security_hardening_rls.sql` in the Supabase SQL Editor to activate the `WITH CHECK (auth.uid() = user_id)` RLS clauses, `settings_avatar_url_https_chk` constraint, and database-level `registration_mode` / `allowed_email_domains` trigger enforcement.
2. **Supabase Dashboard Storage Bucket MIME Restriction**:
   - In the Supabase Dashboard under **Storage → `avatars` → Bucket Settings**, set **Allowed MIME types** to `image/jpeg, image/png, image/webp` and **File size limit** to `2 MB` to complement the client-side validation in `lib/security.ts`.
3. **Dev-Only ESLint Toolchain Advisories**:
   - The remaining 8 `npm audit` advisories exist exclusively in dev-time CLI packages (`@eslint/eslintrc` → `minimatch@3.1.2` and `shadcn` → `fast-glob` → `braces@3.0.3`) and are never bundled into runtime or production server code (`npm audit --omit=dev` reports `0` vulnerabilities). Migrating to ESLint 9 Flat Config when upgrading to Next.js 16 will eliminate `@eslint/eslintrc`.
