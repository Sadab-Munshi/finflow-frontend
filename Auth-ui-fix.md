---
name: finflow-auth-ui-fix
description: >
  Fixes visual UI issues on FinFlow login and signup pages. Mobile-first fixes:
  button colors, Google button style, label text size, subtext copy, Turnstile
  widget position, back-to-home link, and landing page hero text size reduction.
  Visual changes only — zero logic, zero auth, zero form handling touched.
---

# FinFlow Auth UI Fix — GitHub Copilot Agent

You have full repo access. **Read files first, edit directly. Touch ONLY visual/className changes.**

⚠️ STRICT RULE: Do NOT touch any of these:
- Form submission logic
- Auth handlers
- Supabase calls
- Turnstile verification logic
- Google OAuth logic
- Any `onSubmit`, `handleSubmit`, `signIn`, `signUp` functions
- Any `useEffect` that handles auth state

Only change: classNames, text content, layout structure, and element order.

---

## Target Files

```
components/auth/SignupForm.tsx
components/auth/LoginForm.tsx
components/auth/GoogleButton.tsx
app/(landing)/page.tsx
```

---

## STEP 1 — Scan All Target Files

Read all 4 files fully before touching anything. Confirm:

**SignupForm.tsx:**
- Subtext: "Join thousands managing their finances smarter with AI"
- Label classNames for FULL NAME, EMAIL etc
- "Create Account" button className
- Turnstile widget position relative to form fields and submit button

**LoginForm.tsx:**
- "Sign In" button className
- Label classNames

**GoogleButton.tsx:**
- Button background color className

**app/(landing)/page.tsx:**
- `<h1>` className with text sizes
- Subtext `<p>` className with text sizes

Do not proceed until all 4 files are fully read.

---

## STEP 2 — Fix Signup Subtext (`components/auth/SignupForm.tsx`)

Find the subtext below the "Create Your Account" heading.
It currently says something like:
```tsx
"Join thousands managing their finances smarter with AI"
```

Replace the text content ONLY (do not change the className) with:
```
Track every rupee — effortlessly and securely.
```

> This is authentic — no fake "thousands" claim for a first project.

---

## STEP 3 — Fix Label Text Style (`components/auth/SignupForm.tsx` + `components/auth/LoginForm.tsx`)

### In both files:
Find the form field labels: FULL NAME, EMAIL, PASSWORD, CONFIRM PASSWORD.

They likely have classNames like:
```tsx
className="text-xs font-semibold tracking-widest uppercase text-neutral-700"
// OR
className="block text-xs font-semibold uppercase tracking-wider mb-1"
```

Replace the className with:
```tsx
className="block text-sm font-medium text-neutral-600 mb-1"
```

Changes:
- `text-xs` → `text-sm` (more readable on mobile)
- Remove `uppercase` — sentence case feels less harsh
- Remove `tracking-widest` — reduces aggressive feel
- Keep `font-medium` and `text-neutral-600`

Do this for ALL field labels in both SignupForm and LoginForm.

---

## STEP 4 — Fix "Create Account" Button Color (`components/auth/SignupForm.tsx`)

Find the submit button. It currently looks grey/dark, likely:
```tsx
className="w-full bg-gray-800 text-white rounded-full py-3..."
// OR
className="w-full bg-neutral-800 hover:bg-neutral-700..."
// OR
className="w-full bg-gray-600..."
```

Replace the background color classes ONLY with teal brand colors:
```tsx
// Replace bg-gray-* or bg-neutral-* with:
bg-teal-600 hover:bg-teal-700
```

Full example:
```tsx
className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-full py-3 font-semibold transition-colors"
```

Do NOT touch the button's onClick, type, disabled state, or loading logic.

---

## STEP 5 — Fix "Sign In" Button Color (`components/auth/LoginForm.tsx`)

Same fix as Step 4 — find the Sign In submit button.

Replace its background color classes:
```tsx
// FROM (whatever dark color it is):
bg-gray-900 OR bg-neutral-900 OR bg-black

// TO:
bg-teal-600 hover:bg-teal-700
```

Do NOT touch any auth logic.

---

## STEP 6 — Fix Google Button Style (`components/auth/GoogleButton.tsx`)

Find the Google button. It currently has a dark/black background:
```tsx
className="w-full bg-gray-900 text-white..."
// OR
className="w-full bg-black text-white..."
```

Replace with white Google button style:
```tsx
className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full py-3 font-medium flex items-center justify-center gap-3 transition-colors"
```

This follows Google's brand guidelines and looks much cleaner on the light teal background.

Do NOT touch the onClick or Google OAuth handler.

---

## STEP 7 — Fix Turnstile Widget Position (`components/auth/SignupForm.tsx`)

### Problem
Turnstile widget is rendering between form fields and the submit button,
visually blocking the form layout.

### Fix
Find the `<TurnstileWidget />` or `<Turnstile />` component inside SignupForm.

Move it so it appears in this order:
```tsx
{/* 1. All form fields (name, email, password, confirm password) */}
{/* 2. Terms/Privacy checkbox */}
{/* 3. TurnstileWidget ← move here */}
{/* 4. Create Account button */}
{/* 5. Divider "or continue with" */}
{/* 6. Google button */}
```

Only change the JSX position of `<TurnstileWidget />`.
Do NOT change any props, callbacks, or verification logic on it.

---

## STEP 8 — Add Back-to-Home Link

### In `components/auth/SignupForm.tsx` AND `components/auth/LoginForm.tsx`

Find the top of each form — there's likely an icon/logo at the top.

After the logo/icon element, add this link:
```tsx
import Link from 'next/link'

<Link
  href="/"
  className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-teal-600 transition-colors mb-6 self-start"
>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  Back to home
</Link>
```

Place it ABOVE the "Create Your Account" / "Welcome Back" heading.

---

## STEP 9 — Reduce Landing Page Hero Text (`app/(landing)/page.tsx`)

### Problem
On mobile, `text-4xl` (36px) is too large — headline breaks into 3 lines.

### Fix
Find the `<h1>` className:
```tsx
className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold..."
```

Replace text size classes only:
```tsx
className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 tracking-tight leading-tight mb-6 reveal"
```

Changes:
- mobile: `text-4xl` → `text-3xl` (30px — fits 2 clean lines)
- sm: `text-5xl` → `text-4xl`
- md: `text-6xl` → `text-5xl`
- lg: `text-7xl` → `text-6xl`

Also find the hero subtext `<p>`:
```tsx
className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto mb-10 reveal"
```

Replace:
```tsx
className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto mb-10 reveal"
```

- mobile: `text-lg` → `text-base` (tighter on small screens)
- sm+: `text-xl` → `text-lg`

---

## STEP 10 — Self Verify

After all edits confirm:

```
✅ Signup subtext changed — no "thousands"
✅ All field labels: text-sm font-medium, no uppercase, no tracking-widest
✅ Create Account button: bg-teal-600 hover:bg-teal-700
✅ Sign In button: bg-teal-600 hover:bg-teal-700
✅ Google button: white bg, gray border, gray text
✅ TurnstileWidget moved: above submit button, below checkbox
✅ Back to home link added in both SignupForm and LoginForm
✅ Landing h1: text-3xl sm:text-4xl md:text-5xl lg:text-6xl
✅ Landing p: text-base sm:text-lg
✅ Zero auth logic touched
✅ Zero form handlers touched
✅ Zero Supabase calls touched
```

---

## STEP 11 — Report

```
## ✅ Auth UI Fixes Applied

### Files Edited:
- components/auth/SignupForm.tsx
  → Subtext: removed "thousands" — authentic copy
  → Labels: text-sm, no uppercase
  → Create Account button: teal-600
  → Turnstile: moved above submit button
  → Back to home link added

- components/auth/LoginForm.tsx
  → Labels: text-sm, no uppercase
  → Sign In button: teal-600
  → Back to home link added

- components/auth/GoogleButton.tsx
  → White background, gray border — Google brand compliant

- app/(landing)/page.tsx
  → h1: reduced one step each breakpoint
  → subtext p: text-base mobile, text-lg sm+

### ⚠️ Nothing touched:
- Auth logic, Supabase, OAuth, Turnstile verification
- Form submission handlers
- Any useEffect auth flows
```
