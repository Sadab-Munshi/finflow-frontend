# Security Audit Report

**Audit Date:** April 1, 2026
**Auditor:** Automated Security Audit (Copilot)
**Repository:** sa-munshi/finflow-final

---

## Project Overview

FinFlow is a personal finance management web application built with the following stack:

- **Framework:** Next.js 15 (App Router) with React 19, TypeScript 5
- **Database / Auth:** Supabase (PostgreSQL + Auth + Storage)
- **AI Services:** Mistral (NLP), Gemini (receipt scanning), Groq/LLaMA (insights), Sarvam (speech-to-text)
- **Email:** Brevo (Sendinblue) transactional emails
- **Analytics:** PostHog
- **CAPTCHA:** Cloudflare Turnstile
- **Push Notifications:** Web Push (VAPID)
- **Messaging:** WhatsApp & Telegram bot integration
- **PDF Generation:** jsPDF + html2canvas
- **Deployment:** Vercel with cron jobs
- **Styling:** Tailwind CSS 4, Radix UI, Framer Motion

The app allows users to track income/expenses, set budgets, generate financial reports, and receive AI-powered insights. It features manual, NLP, voice, and receipt-scan transaction entry modes.

---

## Executive Summary

- **Total issues found:** 25
- **Critical:** 2
- **High:** 7
- **Medium:** 10
- **Low:** 4
- **Informational:** 2

The most severe issues are a **hardcoded admin password in source code** and **multiple unauthenticated API endpoints with service-role database access**. Several API routes lack input validation, rate limiting, and proper error handling. No security headers (CSP, X-Frame-Options, etc.) are configured. Dependency audit reveals 10 vulnerabilities including 2 critical (jsPDF, Next.js).

---

## Severity Legend

| Severity | Description |
|----------|-------------|
| **Critical** | Immediate exploitation risk. Data breach, full system compromise, or credential exposure. Fix immediately. |
| **High** | Significant security weakness. Could lead to unauthorized access, data leakage, or privilege escalation. Fix within days. |
| **Medium** | Moderate risk. Requires specific conditions to exploit but still warrants prompt attention. Fix within weeks. |
| **Low** | Minor risk with limited impact. Should be addressed in normal development cycle. |
| **Informational** | Best practice recommendation. No direct exploit but improves security posture. |

---

## Findings Summary Table

| ID | Title | Severity | File/Area | Status | Short Fix |
|----|-------|----------|-----------|--------|-----------|
| SA-01 | Hardcoded admin password in source code | Critical | `app/api/admin/verify/route.ts` | Open | Move to env var, use bcrypt |
| SA-02 | Unauthenticated endpoints with service-role DB access | Critical | `check-ban`, `check-ip-ban`, `heartbeat`, `track-login` | Open | Add auth checks |
| SA-03 | Unencrypted HTTP call to geo-IP service (SSRF risk) | High | `app/api/track-login/route.ts:16` | Open | Use HTTPS, validate IP input |
| SA-04 | Open redirect in auth callback | High | `app/auth/callback/route.ts:21` | Open | Validate `next` param |
| SA-05 | Gemini API key passed in URL query string | High | `app/api/ai/parse-receipt/route.ts:51` | Open | Use request header instead |
| SA-06 | No input validation on API routes (missing Zod) | High | All API routes | Open | Add Zod schemas |
| SA-07 | Missing security headers (CSP, X-Frame-Options, etc.) | High | `next.config.ts` | Open | Add headers in config |
| SA-08 | Unauthenticated welcome-email and WhatsApp endpoints | High | `api/auth/welcome-email`, `api/whatsapp/notify` | Open | Add auth or rate limit |
| SA-09 | Error messages leak internal details | High | Multiple API routes | Open | Return generic errors |
| SA-10 | No file size limit on audio upload | Medium | `app/api/ai/speech-to-text/route.ts` | Open | Add size check |
| SA-11 | Hardcoded PostHog key fallback | Medium | `lib/posthog.ts:5` | Open | Remove fallback |
| SA-12 | Weak admin password hashing (SHA-256, no salt) | Medium | `app/api/admin/verify/route.ts:6-7` | Open | Use bcrypt/argon2 |
| SA-13 | Timing-unsafe secret comparison | Medium | `api/admin/verify`, `api/notifications/budget-alert` | Open | Use `timingSafeEqual` |
| SA-14 | Missing rate limiting on auth-related endpoints | Medium | Turnstile verify, admin verify, welcome-email | Open | Add rate limiting |
| SA-15 | AI response JSON parsing without schema validation | Medium | `parse-text`, `parse-receipt`, `insights` | Open | Validate with Zod |
| SA-16 | `dangerouslySetInnerHTML` usage in layout | Medium | `app/layout.tsx:145` | Open | Use standard script tag |
| SA-17 | Ban check endpoint leaks ban_reason | Medium | `app/api/check-ban/route.ts:21` | Open | Remove reason from response |
| SA-18 | Speech-to-text leaks Sarvam error details | Medium | `app/api/ai/speech-to-text/route.ts:42` | Open | Remove `details` field |
| SA-19 | Budget-alert leaks Supabase error messages | Medium | `app/api/notifications/budget-alert/route.ts:161,195,210` | Open | Return generic errors |
| SA-20 | No timeout on external API calls | Low | All AI routes, track-login, budget-alert | Open | Add AbortSignal.timeout |
| SA-21 | ESLint & TypeScript errors ignored during build | Low | `next.config.ts:4-8` | Open | Enable in CI pipeline |
| SA-22 | Admin panel path uses security by obscurity | Low | `app/admin-fxk92p-sadab/` | Open | Rely on auth only |
| SA-23 | PostHog cookie expiration set to 365 days | Low | `lib/posthog.ts:11` | Open | Reduce to 30 days |
| SA-24 | Dependency vulnerabilities (10 total, 2 critical) | Informational | `package.json` | Open | Run `npm audit fix` |
| SA-25 | Missing audit trail for critical actions | Informational | All admin/delete routes | Open | Add logging table |

---

## Detailed Findings

### SA-01 — Hardcoded Admin Password in Source Code

- **Severity:** Critical
- **Affected file(s):** `app/api/admin/verify/route.ts` (line 7)
- **Description:** The admin verification endpoint contains a plaintext password hardcoded directly in the source code. The password `W1VZ************UO` is used to authenticate admin access.
- **Why it is risky:** Anyone with access to the repository (contributors, CI/CD logs, or if the repo is ever made public) can authenticate as admin. The password cannot be rotated without a code deployment.
- **Evidence from code:**
  ```typescript
  const validHash = crypto.createHash('sha256').update('W1VZ16NcCQQKD99pTeHb8wxTKINs66UO').digest('hex')
  ```
- **Recommended fix:** Move the password hash to an environment variable. Use bcrypt or argon2 instead of SHA-256.
- **Safe code example:**
  ```typescript
  import bcrypt from 'bcrypt'

  export async function POST(req: NextRequest) {
    const { password } = await req.json()
    const validHash = process.env.ADMIN_PASSWORD_HASH
    if (!validHash) return NextResponse.json({ ok: false }, { status: 500 })
    const isValid = await bcrypt.compare(password, validHash)
    if (isValid) { /* set cookie */ }
  }
  ```
- **Remediation priority:** Immediate — rotate the exposed password NOW
- **Status:** Open

---

### SA-02 — Unauthenticated Endpoints with Service-Role Database Access

- **Severity:** Critical
- **Affected file(s):**
  - `app/api/check-ban/route.ts`
  - `app/api/check-ip-ban/route.ts`
  - `app/api/heartbeat/route.ts`
  - `app/api/track-login/route.ts`
- **Description:** These endpoints accept arbitrary `userId` or `ipAddress` from the request body without any authentication. They use `SUPABASE_SERVICE_ROLE_KEY` which bypasses all Row Level Security (RLS).
- **Why it is risky:**
  - **check-ban:** Anyone can query ban status for ANY userId and see ban reasons (information disclosure, user enumeration)
  - **check-ip-ban:** Anyone can probe if an IP is banned (information disclosure)
  - **heartbeat:** Anyone can spoof heartbeat for any userId (fake online status)
  - **track-login:** Anyone can log fake login data for any userId (data poisoning, IP spoofing)
- **Evidence from code:**
  ```typescript
  // check-ban/route.ts - No auth, accepts any userId
  const { userId } = await req.json()
  const { data } = await supabase.from('user_management').select('*').eq('user_id', userId)
  return NextResponse.json({ banned: data?.is_banned, reason: data?.ban_reason })

  // track-login/route.ts - No auth, writes to DB with any userId
  const { userId, email, ipAddress } = await req.json()
  await supabase.from('user_management').upsert({ user_id: userId, email, ip_address: ipAddress ... })
  ```
- **Recommended fix:** Add authentication: verify the session user matches the requested userId. For ban checks during login flow, use a signed token or move the check server-side in middleware.
- **Safe code example:**
  ```typescript
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Only allow checking own ban status
  if (user.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  ```
- **Remediation priority:** Immediate
- **Status:** Open

---

### SA-03 — Unencrypted HTTP Call to Geo-IP Service (SSRF Risk)

- **Severity:** High
- **Affected file(s):** `app/api/track-login/route.ts` (line 16)
- **Description:** The endpoint makes an HTTP (not HTTPS) request to `http://ip-api.com/json/${ipAddress}`. The `ipAddress` parameter comes directly from user input without validation.
- **Why it is risky:**
  1. **Man-in-the-middle:** HTTP traffic can be intercepted/modified
  2. **SSRF:** An attacker can pass internal IPs (e.g., `127.0.0.1`, `169.254.169.254`) to probe internal services or cloud metadata endpoints
  3. **Injection:** Malformed ipAddress values could manipulate the URL
- **Evidence from code:**
  ```typescript
  const geoRes = await fetch(`http://ip-api.com/json/${ipAddress}`)
  ```
- **Recommended fix:**
  1. Switch to HTTPS: `https://ip-api.com/json/`
  2. Validate the IP address format with a regex before using it
  3. Block private/reserved IP ranges
- **Safe code example:**
  ```typescript
  const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!IP_REGEX.test(ipAddress)) return NextResponse.json({ error: 'Invalid IP' }, { status: 400 })
  // Block private ranges
  if (ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.') || ipAddress.startsWith('127.'))
    return NextResponse.json({ error: 'Invalid IP' }, { status: 400 })
  const geoRes = await fetch(`https://ip-api.com/json/${ipAddress}`)
  ```
- **Remediation priority:** High — fix within 1 week
- **Status:** Open

---

### SA-04 — Open Redirect in Auth Callback

- **Severity:** High
- **Affected file(s):** `app/auth/callback/route.ts` (line 21)
- **Description:** The `next` query parameter is used directly in a redirect without validation. While it's prepended with `origin`, an attacker could craft paths like `//evil.com` which some browsers interpret as protocol-relative URLs.
- **Why it is risky:** Open redirects can be used in phishing attacks. After a legitimate OAuth flow, users can be redirected to a malicious site that looks identical to the app.
- **Evidence from code:**
  ```typescript
  const next = searchParams.get('next') ?? '/dashboard'
  return NextResponse.redirect(`${origin}${next}`)
  ```
- **Recommended fix:** Validate that `next` starts with `/` and does not start with `//`. Use an allowlist of valid paths.
- **Safe code example:**
  ```typescript
  const next = searchParams.get('next') ?? '/dashboard'
  const safePaths = ['/dashboard', '/history', '/add', '/budgets', '/insights', '/reports', '/settings', '/profile']
  const safeNext = safePaths.some(p => next.startsWith(p)) ? next : '/dashboard'
  return NextResponse.redirect(`${origin}${safeNext}`)
  ```
- **Remediation priority:** High
- **Status:** Open

---

### SA-05 — Gemini API Key Passed in URL Query String

- **Severity:** High
- **Affected file(s):** `app/api/ai/parse-receipt/route.ts` (line 51)
- **Description:** The Gemini API key is embedded in the URL query parameter instead of being sent in a request header.
- **Why it is risky:** URL query strings are logged by proxies, CDNs, server access logs, and browser history. The API key could be inadvertently exposed in Vercel logs, monitoring tools, or error tracking services.
- **Evidence from code:**
  ```typescript
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
  ```
- **Recommended fix:** Use the `x-goog-api-key` header instead of URL parameter.
- **Safe code example:**
  ```typescript
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({ ... }),
  })
  ```
- **Remediation priority:** High
- **Status:** Open

---

### SA-06 — No Input Validation on API Routes (Missing Zod)

- **Severity:** High
- **Affected file(s):** All API routes under `app/api/`
- **Description:** None of the API routes validate request body structure or types using a schema validation library. Inputs are destructured directly from `req.json()` without type checks, length limits, or format validation.
- **Why it is risky:** Without validation, endpoints accept malformed, oversized, or malicious input. This can lead to unexpected behavior, denial of service, or injection attacks.
- **Evidence from code:**
  ```typescript
  // parse-text/route.ts - no validation
  const { text } = await req.json()
  // insights/route.ts - no validation
  const { transactions } = await req.json()
  // heartbeat/route.ts - no validation
  const userId = body?.userId
  // check-ban/route.ts - no validation
  const { userId } = await req.json()
  ```
- **Recommended fix:** Add Zod schemas to every API route. The project already has `zod` installed.
- **Safe code example:**
  ```typescript
  import { z } from 'zod'

  const ParseTextSchema = z.object({
    text: z.string().min(1).max(10000),
  })

  export async function POST(req: NextRequest) {
    const body = await req.json()
    const result = ParseTextSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { text } = result.data
    // ... proceed safely
  }
  ```
- **Remediation priority:** High — implement across all routes
- **Status:** Open

---

### SA-07 — Missing Security Headers (CSP, X-Frame-Options, etc.)

- **Severity:** High
- **Affected file(s):** `next.config.ts`, `middleware.ts`
- **Description:** The application does not set any security headers. There is no Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy, or Permissions-Policy header configured.
- **Why it is risky:**
  - Without `X-Frame-Options` or CSP `frame-ancestors`: the app can be embedded in iframes (clickjacking)
  - Without `Content-Security-Policy`: no protection against XSS via inline scripts or unauthorized resource loading
  - Without `Strict-Transport-Security`: users may access the site over HTTP
  - Without `X-Content-Type-Options`: browsers may MIME-sniff responses
- **Evidence from code:** The `next.config.ts` `headers()` function only sets `Cache-Control` headers for static assets — no security headers.
- **Recommended fix:** Add security headers in `next.config.ts`.
- **Safe code example:**
  ```typescript
  // In next.config.ts headers()
  {
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '0' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://us.i.posthog.com https://api.mistral.ai https://api.groq.com https://api.sarvam.ai https://generativelanguage.googleapis.com https://api.brevo.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none';" },
    ],
  },
  ```
- **Remediation priority:** High
- **Status:** Open

---

### SA-08 — Unauthenticated Welcome-Email and WhatsApp Endpoints

- **Severity:** High
- **Affected file(s):**
  - `app/api/auth/welcome-email/route.ts`
  - `app/api/whatsapp/notify/route.ts`
- **Description:** These endpoints have no authentication. Anyone can call them to send emails to arbitrary addresses or trigger WhatsApp notifications to any phone number.
- **Why it is risky:**
  - **welcome-email:** Can be abused to spam any email address with welcome emails from FinFlow, damaging sender reputation and potentially getting the Brevo account banned
  - **whatsapp/notify:** Can trigger WhatsApp messages to arbitrary phone numbers through the bot
- **Evidence from code:**
  ```typescript
  // welcome-email - no auth check
  export async function POST(request: NextRequest) {
    const { fullName, email } = await request.json()
    await sendWelcomeEmail(fullName, email)
  }

  // whatsapp/notify - no auth check
  export async function POST(req: NextRequest) {
    const { phone, type, name } = await req.json()
    await fetch(`${botUrl}/send-notification`, { ... body: JSON.stringify({ phone, type, name }) })
  }
  ```
- **Recommended fix:** Add authentication or at minimum a shared secret header check. For welcome-email, verify the caller is the auth callback flow.
- **Safe code example:**
  ```typescript
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ```
- **Remediation priority:** High
- **Status:** Open

---

### SA-09 — Error Messages Leak Internal Details

- **Severity:** High
- **Affected file(s):**
  - `app/api/notifications/budget-alert/route.ts` (lines 161, 195, 210, 303)
  - `app/api/ai/speech-to-text/route.ts` (line 42)
  - Multiple other API routes
- **Description:** Error responses include raw Supabase error messages and API response details, exposing database schema and internal service details to clients.
- **Why it is risky:** Detailed error messages help attackers understand the database schema, table names, column names, and internal architecture to craft targeted attacks.
- **Evidence from code:**
  ```typescript
  // budget-alert/route.ts
  return NextResponse.json({ ok: false, error: `Settings error: ${settingsError.message}` })
  return NextResponse.json({ ok: false, error: `Budgets error: ${budgetsError.message}` })
  return NextResponse.json({ ok: false, error: String(error) })

  // speech-to-text/route.ts
  return NextResponse.json({ error: 'Sarvam API failed', details: responseText }, { status: 500 })
  ```
- **Recommended fix:** Log detailed errors server-side with `console.error()`, return generic error messages to clients.
- **Safe code example:**
  ```typescript
  if (settingsError) {
    console.error('[BUDGET ALERT] Settings error:', settingsError)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
  ```
- **Remediation priority:** High
- **Status:** Open

---

### SA-10 — No File Size Limit on Audio Upload

- **Severity:** Medium
- **Affected file(s):** `app/api/ai/speech-to-text/route.ts` (lines 26-31)
- **Description:** The audio file upload endpoint does not validate file size before loading the entire file into memory via `arrayBuffer()`.
- **Why it is risky:** An attacker could upload extremely large files to exhaust server memory, causing denial of service.
- **Evidence from code:**
  ```typescript
  const audioFile = formData.get('audio') as File
  if (!audioFile) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
  // No size check before loading into memory
  sarvamForm.append('file', new Blob([await audioFile.arrayBuffer()], { type: 'audio/wav' }))
  ```
- **Recommended fix:** Add file size validation before processing.
- **Safe code example:**
  ```typescript
  const MAX_AUDIO_SIZE = 25 * 1024 * 1024 // 25MB
  if (audioFile.size > MAX_AUDIO_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 25MB.' }, { status: 413 })
  }
  ```
- **Remediation priority:** Medium
- **Status:** Open

---

### SA-11 — Hardcoded PostHog Key Fallback

- **Severity:** Medium
- **Affected file(s):** `lib/posthog.ts` (line 5)
- **Description:** A PostHog public API key is hardcoded as a fallback value in the source code.
- **Why it is risky:** While PostHog public keys are meant to be client-exposed, hardcoding them means they cannot be rotated without a code change. If the key is compromised or the project is used as a template, analytics data could be sent to the wrong project.
- **Evidence from code:**
  ```typescript
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_3yHL***********************gSmH', {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  ```
- **Recommended fix:** Remove the fallback. If the env var is not set, don't initialize PostHog.
- **Safe code example:**
  ```typescript
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (key && typeof window !== 'undefined') {
    posthog.init(key, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com', ... })
  }
  ```
- **Remediation priority:** Medium
- **Status:** Open

---

### SA-12 — Weak Admin Password Hashing (SHA-256, No Salt)

- **Severity:** Medium
- **Affected file(s):** `app/api/admin/verify/route.ts` (lines 6-7)
- **Description:** The admin password is hashed with plain SHA-256 without salt. SHA-256 is a fast hash unsuitable for password storage.
- **Why it is risky:** SHA-256 hashes can be brute-forced at billions of attempts per second using GPUs. Without salt, identical passwords produce identical hashes, enabling rainbow table attacks.
- **Evidence from code:**
  ```typescript
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  const validHash = crypto.createHash('sha256').update('W1VZ16NcCQQKD99pTeHb8wxTKINs66UO').digest('hex')
  ```
- **Recommended fix:** Use bcrypt or argon2id with a work factor of at least 12.
- **Safe code example:**
  ```typescript
  import bcrypt from 'bcrypt'
  const isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH!)
  ```
- **Remediation priority:** Medium (coupled with SA-01)
- **Status:** Open

---

### SA-13 — Timing-Unsafe Secret Comparison

- **Severity:** Medium
- **Affected file(s):**
  - `app/api/admin/verify/route.ts` (line 9)
  - `app/api/notifications/budget-alert/route.ts` (line 138)
  - `app/api/cron/monthly-report/route.ts`
- **Description:** Secret comparisons use JavaScript `===` operator which is not constant-time, potentially leaking information through timing side-channels.
- **Why it is risky:** Timing attacks can reveal the correct secret value one character at a time by measuring response time differences.
- **Evidence from code:**
  ```typescript
  if (hash === validHash) { ... }
  if (botSecret && botSecret === process.env.WEBHOOK_SECRET) { ... }
  ```
- **Recommended fix:** Use `crypto.timingSafeEqual()` for all secret comparisons.
- **Safe code example:**
  ```typescript
  import crypto from 'crypto'
  const isValid = crypto.timingSafeEqual(
    Buffer.from(botSecret, 'utf8'),
    Buffer.from(process.env.WEBHOOK_SECRET!, 'utf8')
  )
  ```
- **Remediation priority:** Medium
- **Status:** Open

---

### SA-14 — Missing Rate Limiting on Auth-Related Endpoints

- **Severity:** Medium
- **Affected file(s):**
  - `app/api/admin/verify/route.ts`
  - `app/api/auth/verify-turnstile/route.ts`
  - `app/api/auth/welcome-email/route.ts`
  - `app/api/check-ban/route.ts`, `app/api/check-ip-ban/route.ts`
  - `app/api/heartbeat/route.ts`
  - `app/api/track-login/route.ts`
- **Description:** These endpoints have no rate limiting. The AI routes have rate limiting via `checkAndIncrementUsage()`, but auth and admin endpoints do not.
- **Why it is risky:** Allows brute-force attacks on admin password, CAPTCHA bypass attempts, email spam through welcome-email, and resource exhaustion.
- **Evidence from code:** No rate limiting middleware or checks found in any of the listed routes.
- **Recommended fix:** Implement server-side rate limiting. For Vercel, use `@vercel/edge-rate-limit` or implement IP-based rate limiting with Supabase.
- **Safe code example:**
  ```typescript
  // Simple IP-based rate limit using Map (for serverless, use KV/Redis)
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
  function checkRateLimit(ip: string, limit = 5, windowMs = 60000): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(ip)
    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
      return true
    }
    if (entry.count >= limit) return false
    entry.count++
    return true
  }
  ```
- **Remediation priority:** Medium
- **Status:** Open

---

### SA-15 — AI Response JSON Parsing Without Schema Validation

- **Severity:** Medium
- **Affected file(s):**
  - `app/api/ai/parse-text/route.ts` (line 95)
  - `app/api/ai/parse-receipt/route.ts` (line 64)
  - `app/api/ai/insights/route.ts` (line 54)
- **Description:** AI responses are extracted via regex and parsed with `JSON.parse()` without validating the structure matches the expected schema. Parsed data is returned directly to clients.
- **Why it is risky:** Malformed AI responses could contain unexpected fields, wrong types, or excessive data. If an AI model is compromised or returns unexpected content, it passes through to the client unvalidated.
- **Evidence from code:**
  ```typescript
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(jsonMatch[0])
  return NextResponse.json(parsed)  // No validation
  ```
- **Recommended fix:** Validate parsed AI responses with Zod schemas before returning.
- **Safe code example:**
  ```typescript
  const TransactionSchema = z.object({
    transactions: z.array(z.object({
      amount: z.number().positive(),
      type: z.enum(['income', 'expense']),
      category: z.string(),
      date: z.string().optional(),
      note: z.string().optional(),
      confidence: z.number().min(0).max(1),
    }))
  })
  const validated = TransactionSchema.parse(parsed)
  return NextResponse.json(validated)
  ```
- **Remediation priority:** Medium
- **Status:** Open

---

### SA-16 — `dangerouslySetInnerHTML` Usage in Layout

- **Severity:** Medium
- **Affected file(s):** `app/layout.tsx` (approximately line 145)
- **Description:** The root layout uses `dangerouslySetInnerHTML` to inject a JSON-LD structured data script.
- **Why it is risky:** While the current usage is safe (static `JSON.stringify` of an app-controlled object), the pattern is flagged by security scanners and could become dangerous if user-controlled data is ever added to the `jsonLd` object.
- **Evidence from code:**
  ```tsx
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
  />
  ```
- **Recommended fix:** Use Next.js built-in JSON-LD support or a standard approach.
- **Safe code example:**
  ```tsx
  <script type="application/ld+json" suppressHydrationWarning>
    {JSON.stringify(jsonLd)}
  </script>
  ```
- **Remediation priority:** Medium (low actual risk)
- **Status:** Open

---

### SA-17 — Ban Check Endpoint Leaks Ban Reason

- **Severity:** Medium
- **Affected file(s):** `app/api/check-ban/route.ts` (line 21)
- **Description:** The ban check endpoint returns the `ban_reason` field which may contain internal admin notes not meant for users.
- **Why it is risky:** Admin notes in ban reasons may contain sensitive information about the investigation, other users, or internal policies.
- **Evidence from code:**
  ```typescript
  return NextResponse.json({
    banned: data?.is_banned === true,
    reason: data?.ban_reason || '',  // leaks admin notes
  })
  ```
- **Recommended fix:** Only return the ban status, not the reason. Show a generic message on the client.
- **Safe code example:**
  ```typescript
  return NextResponse.json({ banned: data?.is_banned === true })
  ```
- **Remediation priority:** Medium
- **Status:** Open

---

### SA-18 — Speech-to-Text Leaks Sarvam API Error Details

- **Severity:** Medium
- **Affected file(s):** `app/api/ai/speech-to-text/route.ts` (line 42)
- **Description:** When the Sarvam API fails, the raw error response text is forwarded to the client.
- **Why it is risky:** The response may contain internal API details, rate limit information, or error codes that help attackers understand the backend service.
- **Evidence from code:**
  ```typescript
  if (!response.ok) return NextResponse.json({ error: 'Sarvam API failed', details: responseText }, { status: 500 })
  ```
- **Recommended fix:** Log the details server-side, return a generic error.
- **Safe code example:**
  ```typescript
  if (!response.ok) {
    console.error('[speech-to-text] Sarvam API error:', responseText)
    return NextResponse.json({ error: 'Speech recognition failed. Please try again.' }, { status: 500 })
  }
  ```
- **Remediation priority:** Medium
- **Status:** Open

---

### SA-19 — Budget-Alert Leaks Supabase Error Messages

- **Severity:** Medium
- **Affected file(s):** `app/api/notifications/budget-alert/route.ts` (lines 161, 195, 210, 303)
- **Description:** Multiple error paths in the budget-alert endpoint return raw Supabase error messages and stringified exceptions to the client.
- **Why it is risky:** Supabase errors may contain table names, column names, constraint names, and other schema details.
- **Evidence from code:**
  ```typescript
  return NextResponse.json({ ok: false, error: `Settings error: ${settingsError.message}` })
  return NextResponse.json({ ok: false, error: `Budgets error: ${budgetsError.message}` })
  return NextResponse.json({ ok: false, error: `Transactions error: ${txError.message}` })
  return NextResponse.json({ ok: false, error: String(error) })
  ```
- **Recommended fix:** Replace all with generic error messages and log details server-side.
- **Remediation priority:** Medium
- **Status:** Open

---

### SA-20 — No Timeout on External API Calls

- **Severity:** Low
- **Affected file(s):** All AI routes, `track-login/route.ts`, `budget-alert/route.ts`
- **Description:** External API calls (Mistral, Gemini, Groq, Sarvam, Brevo, ip-api) do not specify timeouts. A slow or unresponsive external service can hang the request indefinitely, consuming serverless function execution time.
- **Why it is risky:** Slow external services can cause cascading delays and exhaust serverless function concurrency limits (denial of service).
- **Evidence from code:** No `signal: AbortSignal.timeout()` found on any `fetch()` call.
- **Recommended fix:** Add `AbortSignal.timeout(30000)` to all external fetch calls.
- **Safe code example:**
  ```typescript
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(30000), // 30 second timeout
    headers: { ... },
    body: JSON.stringify({ ... }),
  })
  ```
- **Remediation priority:** Low
- **Status:** Open

---

### SA-21 — ESLint & TypeScript Errors Ignored During Build

- **Severity:** Low
- **Affected file(s):** `next.config.ts` (lines 4-8)
- **Description:** Both ESLint and TypeScript errors are ignored during production builds.
- **Why it is risky:** Type errors and lint warnings that could indicate security issues (unused variables hiding logic bugs, type mismatches causing runtime errors) are silently ignored.
- **Evidence from code:**
  ```typescript
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  ```
- **Recommended fix:** Enable at least TypeScript checking in CI/CD. Fix existing errors rather than suppressing them.
- **Remediation priority:** Low
- **Status:** Open

---

### SA-22 — Admin Panel Path Uses Security by Obscurity

- **Severity:** Low
- **Affected file(s):** `app/admin-fxk92p-sadab/`
- **Description:** The admin panel uses an obscure URL path (`admin-fxk92p-sadab`) as an additional layer of protection.
- **Why it is risky:** While the admin panel has proper auth checks (Supabase session + `is_admin` flag in DB), the obscure path provides no real security. Path is visible in the repository.
- **Evidence from code:** Directory name: `app/admin-fxk92p-sadab/`
- **Recommended fix:** Rename to a standard path like `/admin` since auth already protects it. Security through obscurity adds complexity without security.
- **Remediation priority:** Low
- **Status:** Open

---

### SA-23 — PostHog Cookie Expiration Set to 365 Days

- **Severity:** Low
- **Affected file(s):** `lib/posthog.ts` (line 11)
- **Description:** PostHog analytics cookie is set to expire after 365 days.
- **Why it is risky:** Long cookie lifetimes increase the window for cookie theft and violate GDPR/privacy best practices.
- **Evidence from code:**
  ```typescript
  cookie_expiration: 365,
  ```
- **Recommended fix:** Reduce to 30-90 days.
- **Remediation priority:** Low
- **Status:** Open

---

### SA-24 — Dependency Vulnerabilities (10 Total, 2 Critical)

- **Severity:** Informational
- **Affected file(s):** `package.json`, `package-lock.json`
- **Description:** `npm audit` reports 10 vulnerabilities. See Dependency Audit section below for details.
- **Status:** Open

---

### SA-25 — Missing Audit Trail for Critical Actions

- **Severity:** Informational
- **Affected file(s):** Admin routes, delete routes, settings changes
- **Description:** No logging or audit trail for critical actions like banning users, deleting transactions, changing settings, or admin access. There is no way to review who did what and when.
- **Recommended fix:** Create an `audit_log` table to record critical actions with timestamps, actor, and action details.
- **Status:** Open

---

## Dependency Audit

`npm audit` results (10 vulnerabilities):

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| `jspdf` ≤4.2.0 | **Critical** | PDF Object Injection, HTML Injection in New Window | Upgrade to ≥4.2.1 |
| `next` 9.5.0–15.5.13 | **Critical** | Multiple: SSRF, auth bypass, DoS, cache confusion, info exposure | Upgrade to ≥15.5.14 |
| `@hono/node-server` <1.19.10 | High | Authorization bypass via encoded slashes | `npm audit fix` |
| `hono` ≤4.12.6 | High | Cookie injection, SSE injection, file access, prototype pollution | `npm audit fix` |
| `flatted` ≤3.4.1 | High | DoS via unbounded recursion, prototype pollution | `npm audit fix` |
| `path-to-regexp` 8.0.0–8.3.0 | High | ReDoS via sequential optional groups | `npm audit fix` |
| `picomatch` ≤2.3.1 | High | Method injection, ReDoS | `npm audit fix` |
| `express-rate-limit` 8.2.0–8.2.1 | High | IPv4-mapped IPv6 bypass | `npm audit fix` |
| `brace-expansion` <1.1.13 | Moderate | Zero-step sequence DoS | `npm audit fix` |
| `dompurify` ≤3.3.1 | Moderate | Mutation XSS, re-contextualization | `npm audit fix` |

**Commands to audit and update safely:**
```bash
# View all vulnerabilities
npm audit

# Auto-fix where possible (non-breaking)
npm audit fix

# For major version bumps (test thoroughly)
npm audit fix --force

# Check for outdated packages
npm outdated
```

---

## Security Headers Recommendations

The application currently has **no security headers** configured. Add the following to `next.config.ts`:

```typescript
// Add to the headers() function in next.config.ts
{
  source: '/(.*)',
  headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.supabase.co",
        "connect-src 'self' https://*.supabase.co https://us.i.posthog.com",
        "font-src 'self' https://fonts.gstatic.com",
        "frame-ancestors 'none'",
      ].join('; '),
    },
  ],
},
```

---

## Authentication & Authorization Review

**Strengths:**
- ✅ Supabase Auth handles user authentication (OAuth, email/password)
- ✅ Middleware protects main app routes (dashboard, history, add, budgets, etc.)
- ✅ Admin panel checks `is_admin` flag in database via `verifyAdmin()`
- ✅ Cloudflare Turnstile CAPTCHA on login/signup
- ✅ Cookie-based session management via `@supabase/ssr`
- ✅ Budget-alert supports bot bypass with `x-bot-secret` header

**Weaknesses:**
- ❌ Multiple API endpoints have NO authentication (check-ban, check-ip-ban, heartbeat, track-login, welcome-email, whatsapp/notify)
- ❌ Admin verify endpoint uses hardcoded password with weak hashing
- ❌ `admin-fxk92p-sadab` path not in middleware's protected routes list
- ❌ Ban enforcement is client-side only (UserContext.tsx) — banned users can still call APIs
- ❌ Password reset only requires minimum 8 characters — no complexity requirements
- ❌ No MFA/2FA support
- ❌ No session invalidation mechanism for compromised accounts

---

## Environment Variables Review

### Sensitive (Server-Only — Must NEVER be NEXT_PUBLIC_):
| Variable | Used In | Risk if Exposed |
|----------|---------|----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Multiple API routes, `lib/supabase/server.ts` | Full database access, bypasses RLS |
| `GROQ_API_KEY` | AI insight routes | Unauthorized AI API usage, billing abuse |
| `MISTRAL_API_KEY` | `api/ai/parse-text` | Unauthorized AI API usage |
| `GEMINI_API_KEY` | `api/ai/parse-receipt` | Unauthorized AI API usage |
| `SARVAM_API_KEY` | `api/ai/speech-to-text` | Unauthorized AI API usage |
| `BREVO_API_KEY` | Budget-alert, brevo.ts | Send emails as FinFlow |
| `TURNSTILE_SECRET_KEY` | Turnstile verification | CAPTCHA bypass |
| `WEBHOOK_SECRET` | WhatsApp, budget-alert | Bot impersonation |
| `VAPID_PRIVATE_KEY` | Push send routes | Push notification spoofing |
| `CRON_SECRET` | Cron routes | Trigger cron jobs at will |

### Client-Safe (NEXT_PUBLIC_ — OK to expose):
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Row-level-security scoped key (public) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push public key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics (public) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Analytics endpoint |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | CAPTCHA widget key (public) |
| `NEXT_PUBLIC_APP_URL` | Application URL |

### Recommendations:
1. **Validate all required env vars at startup** — add a startup check that throws if critical vars are missing
2. **Never log env var values** — some error paths in the code may inadvertently log secrets
3. ✅ `.gitignore` properly excludes all `.env*` files — verified

---

## File Upload / Media Handling Review

### Current File Upload Endpoints:
1. **`/api/ai/speech-to-text`** — Audio file upload (WAV)
2. **`/api/ai/parse-receipt`** — Base64-encoded image upload

### Risks:
- ❌ No file size limit on audio upload (SA-10)
- ❌ No file type validation beyond MIME type
- ❌ No virus/malware scanning
- ✅ Files are NOT stored — they are processed and discarded
- ✅ Image upload uses base64 in request body (size limited by request body limit)
- ✅ Client-side image compression exists (max 1200px, JPEG 0.8)

### Mitigations Needed:
1. Add server-side file size limit (25MB for audio, 10MB for images)
2. Validate file type matches expected format
3. Consider adding request body size limit in `next.config.ts` or Vercel config

---

## API Security Review

| Route | Auth | Rate Limit | Input Validation | Notes |
|-------|------|------------|-----------------|-------|
| `/api/admin/verify` | ❌ Hardcoded password | ❌ None | ❌ None | **Critical — fix immediately** |
| `/api/admin/ban` | ✅ verifyAdmin | ❌ None | ❌ None | Needs input validation |
| `/api/admin/users` | ✅ verifyAdmin | ❌ None | N/A | Exposes IP, cookie_id |
| `/api/admin/send-notification` | ✅ verifyAdmin | ❌ None | ❌ None | OK for admin |
| `/api/admin/clear-test-notifications` | ✅ verifyAdmin | ❌ None | N/A | OK |
| `/api/check-ban` | ❌ None | ❌ None | ❌ None | **Critical — add auth** |
| `/api/check-ip-ban` | ❌ None | ❌ None | ❌ None | **Critical — add auth** |
| `/api/heartbeat` | ❌ None | ❌ None | ❌ None | **Add auth** |
| `/api/track-login` | ❌ None | ❌ None | ❌ None | **Critical — add auth, fix SSRF** |
| `/api/auth/verify-turnstile` | ❌ None | ❌ None | ✅ Basic | Needs rate limiting |
| `/api/auth/welcome-email` | ❌ None | ❌ None | ✅ Basic | **Add auth — spam risk** |
| `/api/ai/parse-text` | ✅ Session | ✅ checkAndIncrementUsage | ❌ None | Add Zod validation |
| `/api/ai/parse-receipt` | ✅ Session | ✅ checkAndIncrementUsage | ❌ None | Add validation, fix API key in URL |
| `/api/ai/speech-to-text` | ✅ Session | ✅ checkAndIncrementUsage | ❌ None | Add file size limit |
| `/api/ai/insights` | ✅ Session | ✅ checkAndIncrementUsage | ❌ None | Add Zod validation |
| `/api/ai/report-summary` | ✅ Session | ✅ checkAndIncrementUsage | ❌ None | OK |
| `/api/ai/usage` | ✅ Session | N/A | N/A | OK |
| `/api/notifications/*` | ✅ Session | ❌ None | ❌ None | Leaks error details |
| `/api/notifications/budget-alert` | ✅ Session/Bot secret | ❌ None | ❌ None | Timing-unsafe comparison |
| `/api/push/subscribe` | ✅ Session | ❌ None | ❌ None | OK |
| `/api/push/send` | ✅ Internal | ❌ None | ❌ None | OK |
| `/api/whatsapp/notify` | ❌ None | ❌ None | ❌ None | **Add auth** |
| `/api/whatsapp/check-connection` | ❌ None | ❌ None | ❌ None | Low risk |
| `/api/reports` | ✅ Session | ❌ None | ❌ None | OK |
| `/api/cron/monthly-report` | ✅ CRON_SECRET | ❌ None | N/A | Timing-unsafe comparison |
| `/api/cron/process-report-queue` | ✅ CRON_SECRET | ❌ None | N/A | OK |
| `/auth/callback` | ✅ OAuth code | N/A | ❌ Open redirect risk | **Validate `next` param** |

---

## Deployment Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| HTTPS enforced | ✅ | Vercel enforces HTTPS by default |
| Secure cookies | ⚠️ | `secure` flag conditional on `NODE_ENV` — OK for Vercel production |
| Secret rotation | ❌ | No rotation mechanism; hardcoded admin password cannot be rotated without code change |
| Rate limiting | ⚠️ | Only on AI endpoints; missing on auth, admin, and public endpoints |
| Monitoring/logging | ⚠️ | PostHog for analytics; no security-specific monitoring or alerting |
| Backup and recovery | ❌ | No automated backup strategy documented; app has manual backup/restore page |
| Least privilege access | ⚠️ | Service role key used in several places that don't need it |
| Security headers | ❌ | No security headers configured (see SA-07) |
| Dependency scanning | ❌ | No automated dependency vulnerability scanning in CI |
| Error handling | ❌ | Multiple routes leak internal error details (see SA-09, SA-18, SA-19) |

---

## Quick Wins

These are the **easiest high-impact fixes** that can be done in under an hour each:

1. **Move admin password to env var** (SA-01) — Change one file, add env var in Vercel. Rotate the exposed password immediately.
2. **Add security headers** (SA-07) — Add one object to `next.config.ts` `headers()` array.
3. **Fix Gemini API key in URL** (SA-05) — Change one line to use header instead.
4. **Remove error detail leakage** (SA-09, SA-18, SA-19) — Replace error messages with generic text in ~10 lines across 3 files.
5. **Add file size check** (SA-10) — Add 3 lines to speech-to-text route.
6. **Fix HTTP to HTTPS for ip-api** (SA-03) — Change `http://` to `https://` on line 16 of track-login.
7. **Run `npm audit fix`** (SA-24) — One command to fix most dependency vulnerabilities.
8. **Remove PostHog fallback key** (SA-11) — Edit one line in `lib/posthog.ts`.
9. **Remove ban_reason from response** (SA-17) — Delete one field from response in check-ban.
10. **Validate `next` param in auth callback** (SA-04) — Add 2 lines of path validation.

---

## Manual Review Items

These items require human decision-making:

1. **Admin authentication strategy** — Decide whether to keep a separate admin password system or migrate to Supabase-based admin roles exclusively.
2. **Ban check during login flow** — The ban check currently requires no auth (because the user hasn't logged in yet). Decide how to verify ban status during the login flow without exposing an unauthenticated endpoint.
3. **Service role key usage** — Review each use of `SUPABASE_SERVICE_ROLE_KEY` and determine if RLS bypass is truly needed. Consider creating a more restricted database role.
4. **Password complexity policy** — Decide on password requirements (current: 8 chars minimum, no complexity). Balance security vs. user experience.
5. **Data retention policy** — Decide how long to keep IP addresses, geolocation data, and login history in `user_management`.
6. **GDPR/privacy compliance** — Review if explicit consent is needed for analytics (PostHog), geolocation tracking, and cookie usage.
7. **MFA/2FA implementation** — Decide whether to enable Supabase's built-in MFA for sensitive operations.
8. **Webhook verification** — Decide on a signing mechanism for WhatsApp bot callbacks.

---

## Conclusion

FinFlow's security posture is **moderate with critical gaps**. The application benefits from using Supabase's managed authentication and the Next.js framework's built-in protections. However, several critical vulnerabilities require immediate attention:

**Critical risks:**
- A hardcoded admin password in the source code that must be rotated immediately
- Multiple unauthenticated API endpoints with service-role database access that bypass all Row Level Security

**Systemic issues:**
- No input validation across any API route (despite having Zod installed)
- No security headers configured
- No rate limiting on authentication endpoints
- Error messages leaking internal details

**Positive aspects:**
- ✅ Good `.gitignore` configuration — no env files committed
- ✅ Proper Supabase client/server separation
- ✅ Middleware protects main app routes
- ✅ AI endpoints have usage-based rate limiting
- ✅ TypeScript strict mode enabled
- ✅ CAPTCHA protection on login/signup
- ✅ Backup/restore has thorough input sanitization
- ✅ No use of `eval()`, `new Function()`, or `innerHTML`
- ✅ Service worker properly configured with no-cache

**Recommended prioritization:**
1. **Immediate (today):** Fix SA-01 (hardcoded password), SA-02 (unauth endpoints)
2. **This week:** Fix SA-03–SA-09 (SSRF, open redirect, API key, validation, headers, error leakage)
3. **This month:** Fix SA-10–SA-19 (file limits, hashing, timing, rate limiting, AI validation)
4. **Ongoing:** SA-20–SA-25 (timeouts, build config, audit trail), dependency updates, security monitoring
