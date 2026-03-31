---
name: finflow-landing-page-fixer
description: >
  Directly edits app/(landing)/page.tsx and app/(landing)/layout.tsx to fix all
  SEO, performance, semantic HTML, visual effects, animations, and authenticity
  issues for the FinFlow landing page by Sadab Munshi. Trigger when user asks to
  fix landing page, hero image, border glow cards, antigravity effects, social proof,
  semantic structure, copyright, or any homepage improvement.
---

# FinFlow Landing Page Fixer — GitHub Copilot Agent

You have full repo access. **Read the exact files, then edit them directly.**
Target files:
- `app/(landing)/page.tsx`
- `app/(landing)/layout.tsx`

Do not skip any step. Work in order.

---

## STEP 0 — Install Required Packages

Run these two commands first before any code changes:

```bash
npx shadcn@latest add @react-bits/BorderGlow-JS-CSS
npx shadcn@latest add @react-bits/Antigravity-JS-CSS
```

Wait for both to complete successfully before proceeding.

---

## STEP 1 — Scan Both Files

Read the full content of:
- `app/(landing)/page.tsx`
- `app/(landing)/layout.tsx`

Confirm you can see:
- Hero section with `<Image src="/hero-illustration.png" ...>`
- Features grid with 6 cards mapped from `features` array
- `document.title = 'FinFlow | Home'` in useEffect
- Footer copyright: `© 2026 FinFlow. All rights reserved.`
- Blog link: `href="https://sadabmunshi.online/blog/"`

Do not proceed until both files are fully read.

---

## STEP 2 — Fix Hero Image (`app/(landing)/page.tsx`)

### 2a — Replace hero image src and add proper attributes

Find this exact block:
```tsx
<Image
  src="/hero-illustration.png"
  alt="FinFlow Dashboard"
  width={384}
  height={384}
  className="w-full max-w-sm mx-auto mb-8 drop-shadow-sm"
  priority
/>
```

Replace with:
```tsx
<Image
  src="/hero-dashboard.webp"
  alt="FinFlow dashboard showing total balance of ₹2,58,750 with expense overview chart, spending categories breakdown and recent transactions"
  width={700}
  height={493}
  className="w-full max-w-lg mx-auto mb-8 drop-shadow-xl rounded-2xl"
  priority={true}
  quality={85}
/>
```

### 2b — Remove broken document.title useEffect

Find and DELETE this entire useEffect — it overrides proper metadata:
```tsx
useEffect(() => { document.title = 'FinFlow | Home' }, [])
```

### 2c — Add page-level metadata export

Since this is a `'use client'` page, metadata must go in the layout.
Skip to STEP 7 for metadata fix.

---

## STEP 3 — Add Social Proof Line (`app/(landing)/page.tsx`)

Find this block in the hero section:
```tsx
<p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto mb-10 reveal">
  Track every rupee effortlessly. Voice, camera or text — in your language, backed by a secured database.
</p>
```

Add this immediately AFTER that `<p>` tag, BEFORE the buttons div:
```tsx
<p className="text-sm text-neutral-400 mt-[-24px] mb-6 reveal">
  ✦ Join early users tracking their rupees smarter with FinFlow
</p>
```

---

## STEP 4 — Add BorderGlow to Feature Cards (`app/(landing)/page.tsx`)

### 4a — Add import at top of file

Find the existing imports block at the top of `app/(landing)/page.tsx`.
Add after the last import line:
```tsx
import { BorderGlow } from '@/components/ui/border-glow'
import { Antigravity } from '@/components/ui/antigravity'
```

> Note: Exact import path may vary based on where shadcn installed the components.
> Check the actual installed path in `components/ui/` and use the correct one.

### 4b — Wrap each feature card with BorderGlow

Find the features grid map block:
```tsx
{features.map((feature) => (
  <div
    key={feature.title}
    className="group p-6 rounded-2xl border border-neutral-100 hover:border-neutral-200 hover:shadow-lg transition-all bg-white reveal"
  >
    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-4 group-hover:bg-teal-700 group-hover:text-white transition-colors">
      <feature.icon className="w-6 h-6" />
    </div>
    <h3 className="text-lg font-semibold text-neutral-900 mb-2">{feature.title}</h3>
    <p className="text-neutral-600 leading-relaxed">{feature.description}</p>
  </div>
))}
```

Replace with:
```tsx
{features.map((feature) => (
  <BorderGlow
    key={feature.title}
    glowColor="teal"
    borderRadius="16px"
    className="reveal"
  >
    <div className="group p-6 rounded-2xl bg-white h-full transition-all">
      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-4 group-hover:bg-teal-700 group-hover:text-white transition-colors">
        <feature.icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{feature.title}</h3>
      <p className="text-neutral-600 leading-relaxed">{feature.description}</p>
    </div>
  </BorderGlow>
))}
```

> If BorderGlow component API differs from above (check installed component source),
> adapt props accordingly — the goal is a glowing border on hover for each card.

---

## STEP 5 — Add Antigravity to How It Works Steps (`app/(landing)/page.tsx`)

Find the steps grid map block:
```tsx
{steps.map((step) => (
  <div key={step.number} className="text-center reveal">
    <div className="text-5xl font-bold text-neutral-200 mb-4">{step.number}</div>
    <h3 className="text-xl font-semibold text-neutral-900 mb-3">{step.title}</h3>
    <p className="text-neutral-600 leading-relaxed">{step.description}</p>
  </div>
))}
```

Replace with:
```tsx
{steps.map((step) => (
  <Antigravity key={step.number} className="reveal">
    <div className="text-center p-6">
      <div className="text-5xl font-bold text-neutral-200 mb-4">{step.number}</div>
      <h3 className="text-xl font-semibold text-neutral-900 mb-3">{step.title}</h3>
      <p className="text-neutral-600 leading-relaxed">{step.description}</p>
    </div>
  </Antigravity>
))}
```

> If Antigravity component API differs, check installed component source and adapt.
> Goal: subtle floating/gravity animation on the step cards.

---

## STEP 6 — Add FAQ Section (`app/(landing)/page.tsx`)

Find the closing `</div>` of the HOW IT WORKS section (just before the FINAL CTA section comment).

Insert this entire FAQ section BETWEEN "How it works" and the teal CTA section:

```tsx
{/* ── FAQ ── */}
<section className="py-24 bg-gradient-to-b from-[#f0f9f4] to-[#e8f4fd]">
  <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-12">
      <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4 reveal">
        Frequently Asked Questions
      </h2>
    </div>
    <div className="space-y-4">
      {[
        {
          q: 'Is FinFlow free to use?',
          a: 'Yes, FinFlow is completely free. Sign up and start tracking your expenses immediately with no hidden charges.',
        },
        {
          q: 'Which languages does FinFlow support?',
          a: 'FinFlow supports multiple Indian languages. You can speak your transactions naturally and FinFlow will understand your language and accent.',
        },
        {
          q: 'Is my financial data secure?',
          a: 'Absolutely. Your data is encrypted and stored in a secured database with industry-standard protection at all times.',
        },
        {
          q: 'How do I add a transaction?',
          a: 'You can add transactions by speaking naturally, scanning a receipt with your camera, or typing it manually — whichever is most convenient.',
        },
        {
          q: 'Who made FinFlow?',
          a: 'FinFlow is built by Sadab Munshi, designed to make personal finance effortless for everyone.',
        },
      ].map((item, i) => (
        <details
          key={i}
          className="group border border-neutral-200 rounded-2xl bg-white overflow-hidden reveal"
        >
          <summary className="flex items-center justify-between px-6 py-4 font-semibold text-neutral-900 cursor-pointer list-none select-none hover:bg-neutral-50 transition-colors">
            {item.q}
            <span className="text-teal-600 text-xl group-open:rotate-45 transition-transform duration-200">+</span>
          </summary>
          <p className="px-6 pb-5 text-neutral-600 text-sm leading-relaxed border-t border-neutral-100 pt-3">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  </div>
</section>
```

---

## STEP 7 — Fix Metadata in Layout (`app/(landing)/layout.tsx`)

### 7a — Add metadata export to layout

Since `page.tsx` is `'use client'`, metadata must live in the layout.

Open `app/(landing)/layout.tsx`. At the very top, BEFORE the `'use client'` directive... 

> ⚠️ IMPORTANT: `layout.tsx` currently has `'use client'` because of scroll/menu state.
> Metadata exports do NOT work in client components.
> You have two options — implement Option A:

**Option A (Recommended) — Add metadata to `app/(landing)/metadata.ts`**

Create a new file `app/(landing)/metadata.ts`:

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://app.sadabmunshi.online'),
  title: 'FinFlow – Track Every Rupee by Voice, Camera or Text | Sadab Munshi',
  description:
    'FinFlow by Sadab Munshi — track every rupee effortlessly by voice, camera or text. Free, secure, and available in your language.',
  keywords: [
    'FinFlow', 'Sadab Munshi', 'expense tracker India',
    'rupee tracker', 'voice expense tracker', 'AI finance app',
    'personal finance', 'sadab munshi app',
  ],
  authors: [{ name: 'Sadab Munshi', url: 'https://app.sadabmunshi.online' }],
  creator: 'Sadab Munshi',
  openGraph: {
    type: 'website',
    url: 'https://app.sadabmunshi.online',
    siteName: 'FinFlow',
    title: 'FinFlow – Track Every Rupee by Voice, Camera or Text',
    description: 'Track every rupee — by voice, camera or text. Free, secure, in your language.',
    images: [
      {
        url: 'https://app.sadabmunshi.online/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FinFlow – Smart personal finance tracker by Sadab Munshi',
        type: 'image/png',
      },
    ],
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinFlow – Track Every Rupee by Voice, Camera or Text',
    description: 'Track every rupee — by voice, camera or text. Free and secure.',
    images: ['https://app.sadabmunshi.online/og-image.png'],
  },
  alternates: { canonical: 'https://app.sadabmunshi.online' },
}
```

Then in `app/(landing)/layout.tsx`, add at the very top (before 'use client'):
```typescript
export { metadata } from './metadata'
```

Wait — that won't work with 'use client'. Instead:

**Correct approach — split layout into two files:**

Create `app/(landing)/layout.tsx` as a SERVER component (remove 'use client'):
```tsx
// app/(landing)/layout.tsx — SERVER COMPONENT
import type { Metadata } from 'next'
import LandingShell from '@/components/landing/LandingShell'

export const metadata: Metadata = {
  metadataBase: new URL('https://app.sadabmunshi.online'),
  title: 'FinFlow – Track Every Rupee by Voice, Camera or Text | Sadab Munshi',
  description:
    'FinFlow by Sadab Munshi — track every rupee effortlessly by voice, camera or text. Free, secure, and available in your language.',
  keywords: [
    'FinFlow', 'Sadab Munshi', 'expense tracker India',
    'rupee tracker', 'voice expense tracker', 'AI finance app',
  ],
  authors: [{ name: 'Sadab Munshi', url: 'https://app.sadabmunshi.online' }],
  creator: 'Sadab Munshi',
  openGraph: {
    type: 'website',
    url: 'https://app.sadabmunshi.online',
    siteName: 'FinFlow',
    title: 'FinFlow – Track Every Rupee by Voice, Camera or Text',
    description: 'Track every rupee — by voice, camera or text. Free, secure, in your language.',
    images: [{
      url: 'https://app.sadabmunshi.online/og-image.png',
      width: 1200,
      height: 630,
      alt: 'FinFlow – Smart personal finance tracker by Sadab Munshi',
      type: 'image/png',
    }],
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinFlow – Track Every Rupee by Voice, Camera or Text',
    images: ['https://app.sadabmunshi.online/og-image.png'],
  },
  alternates: { canonical: 'https://app.sadabmunshi.online' },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <LandingShell>{children}</LandingShell>
}
```

Then move ALL the existing layout.tsx client logic (navbar, footer, scroll, menu) into:
`components/landing/LandingShell.tsx` — keep `'use client'` there.

---

## STEP 8 — Fix Copyright (`app/(landing)/layout.tsx` or `LandingShell.tsx`)

Find in the footer:
```tsx
© 2026 FinFlow. All rights reserved.
```

Replace with:
```tsx
© 2026 FinFlow by Sadab Munshi. All rights reserved.
```

---

## STEP 9 — Fix Logo Image Size in Navbar

Find in layout/LandingShell navbar:
```tsx
<Image
  src="/finflow-logo.png"
  alt="FinFlow"
  width={978}
  height={310}
  className="h-8 w-auto object-contain"
  priority
/>
```

The width={978} height={310} are the raw file dimensions — correct them to display size:
```tsx
<Image
  src="/finflow-logo.png"
  alt="FinFlow – Smart Finance Tracker"
  width={120}
  height={38}
  className="h-8 w-auto object-contain"
  priority
/>
```

---

## STEP 10 — Self Verify

After all edits, confirm:

```
✅ Hero src changed to /hero-dashboard.webp with priority={true} quality={85}
✅ document.title useEffect removed from page.tsx
✅ Social proof line added in hero
✅ BorderGlow wrapping all 6 feature cards
✅ Antigravity wrapping all 3 step cards
✅ FAQ section added between How it works and CTA
✅ layout.tsx split into server layout + LandingShell client component
✅ metadata export with "Sadab Munshi" in title
✅ Copyright updated to "FinFlow by Sadab Munshi"
✅ Logo image dimensions corrected
```

---

## STEP 11 — Report to User

```
## ✅ Landing Page Fixes Applied

### Files Edited:
- app/(landing)/page.tsx     — hero image, social proof, BorderGlow cards,
                               Antigravity steps, FAQ section, title useEffect removed
- app/(landing)/layout.tsx   — split into server layout + LandingShell
- components/landing/LandingShell.tsx — created with all client navbar/footer logic
- copyright updated, logo dimensions fixed

### Packages Installed:
- @react-bits/BorderGlow-JS-CSS
- @react-bits/Antigravity-JS-CSS

### ⚠️ One Manual Step:
- Go to squoosh.app → compress /public/hero-dashboard.webp
  → WebP format, 700px wide, 85% quality, target under 100KB
  → Replace the file in /public/

### SEO Impact:
- Title now includes "Sadab Munshi" → helps Google brand recognition
- FAQ section → eligible for Google rich results
- Metadata in server component → properly crawlable
```

---

## Reference

Hero image: `/public/hero-dashboard.webp` — already uploaded ✅
OG image: `/public/og-image.png` — already uploaded ✅
Target URL: `https://app.sadabmunshi.online`
Built by: Sadab Munshi
