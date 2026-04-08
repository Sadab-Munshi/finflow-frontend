# FinFlow — Full SEO Implementation Prompt
> Feed this entire prompt to Claude Code or GitHub Copilot for implementation.

---

## CONTEXT

You are working on **FinFlow**, a Next.js + TypeScript personal finance web app.
- **Live URL**: https://app.sadabmunshi.online/
- **Framework**: Next.js (App Router assumed — adjust if Pages Router)
- **Goal**: Fix Google Search appearance so it shows:
  - Brand name above link: **FinFlow** (not "Sadab Munshi")
  - Page title: **FinFlow** (not "FinFlow — Your Personal Finance Companion | FinFlow")
  - Meta description: clean, keyword-rich, under 160 characters
- **Target users**: Indian users searching for expense tracker, budget app, finance tracker in Hindi/English

---

## TASK: Implement Complete SEO for FinFlow

### 1. ROOT LAYOUT METADATA (`app/layout.tsx`)

Replace or update the existing `metadata` export with the following:

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // ── Core ──────────────────────────────────────────────────
  title: {
    default: 'FinFlow',
    template: '%s | FinFlow',   // subpages will show "Dashboard | FinFlow"
  },
  description:
    'Track every rupee effortlessly. Add expenses by voice, photo, or text in Hindi, English, or Bengali. Free personal finance tracker for India.',

  // ── Canonical & Indexing ──────────────────────────────────
  metadataBase: new URL('https://app.sadabmunshi.online'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  // ── Open Graph (controls social share + Google brand name) ─
  openGraph: {
    type: 'website',
    siteName: 'FinFlow',           // ← THIS fixes "Sadab Munshi" → "FinFlow"
    title: 'FinFlow',
    description:
      'Track every rupee effortlessly. Voice, photo, or text — in your language.',
    url: 'https://app.sadabmunshi.online',
    images: [
      {
        url: '/og-image.png',      // create a 1200×630 image (see asset instructions below)
        width: 1200,
        height: 630,
        alt: 'FinFlow — Personal Finance Tracker for India',
      },
    ],
  },

  // ── Twitter Card ──────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'FinFlow',
    description:
      'Track every rupee effortlessly. Voice, photo, or text — in your language.',
    images: ['/og-image.png'],
  },

  // ── App / PWA Meta ────────────────────────────────────────
  applicationName: 'FinFlow',
  keywords: [
    'expense tracker India',
    'personal finance app',
    'budget tracker Hindi',
    'rupee tracker',
    'voice expense tracker',
    'WhatsApp expense bot',
    'FinFlow',
    'free finance app India',
    'monthly budget India',
    'Bengali expense tracker',
  ],
  authors: [{ name: 'Sadab Munshi', url: 'https://app.sadabmunshi.online' }],
  creator: 'Sadab Munshi',
  publisher: 'FinFlow',
}
```

---

### 2. JSON-LD STRUCTURED DATA COMPONENT

Create a new file: `components/JsonLd.tsx`

```tsx
// components/JsonLd.tsx
export function WebsiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'FinFlow',
          url: 'https://app.sadabmunshi.online',
          description:
            'Track every rupee effortlessly. Add expenses by voice, photo, or text in Hindi, English, or Bengali.',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web, Android, iOS',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'INR',
          },
          author: {
            '@type': 'Person',
            name: 'Sadab Munshi',
          },
          inLanguage: ['en', 'hi', 'bn'],
          audience: {
            '@type': 'Audience',
            geographicArea: {
              '@type': 'Country',
              name: 'India',
            },
          },
        }),
      }}
    />
  )
}

export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'FinFlow',
          url: 'https://app.sadabmunshi.online',
          logo: 'https://app.sadabmunshi.online/logo.png',
          sameAs: [],   // add your Twitter/LinkedIn URLs here later
        }),
      }}
    />
  )
}
```

Then import both into `app/layout.tsx` inside `<body>`:

```tsx
import { WebsiteJsonLd, OrganizationJsonLd } from '@/components/JsonLd'

// Inside your layout's <body>:
<WebsiteJsonLd />
<OrganizationJsonLd />
```

---

### 3. `public/robots.txt`

Create or replace `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://app.sadabmunshi.online/sitemap.xml
```

---

### 4. SITEMAP (`app/sitemap.ts`)

Create `app/sitemap.ts`:

```ts
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://app.sadabmunshi.online',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://app.sadabmunshi.online/login',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: 'https://app.sadabmunshi.online/signup',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    // Add more public pages here as you build them
  ]
}
```

---

### 5. PAGE-LEVEL METADATA (Landing / Home Page)

In `app/page.tsx` (or your landing page component), add:

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FinFlow',   // will show as just "FinFlow" (overrides template for root)
  description:
    'Free personal finance tracker for India. Track expenses by voice, WhatsApp, or photo. Hindi, English & Bengali supported.',
  alternates: {
    canonical: 'https://app.sadabmunshi.online',
  },
}
```

---

### 6. ASSET: OG IMAGE

Create `public/og-image.png` with these specs:
- Size: **1200 × 630 px**
- Content: FinFlow logo + tagline "Track every rupee effortlessly"
- Background: your app's brand color
- This shows when the link is shared on WhatsApp, Twitter, LinkedIn

If you don't have a design tool, use Canva (free) with a 1200×630 template.

---

### 7. VERIFICATION: GOOGLE SEARCH CONSOLE

After deploying all the above:

1. Go to: https://search.google.com/search-console
2. Add property: `https://app.sadabmunshi.online`
3. Verify via **HTML tag method** — add this to `app/layout.tsx` metadata:

```ts
verification: {
  google: 'PASTE_YOUR_VERIFICATION_CODE_HERE',
},
```

4. After verifying, go to **URL Inspection** → enter your URL → click **"Request Indexing"**
5. Also submit your sitemap: Sitemaps section → enter `sitemap.xml`

---

## SUMMARY OF CHANGES

| File | What it fixes |
|------|--------------|
| `app/layout.tsx` | Title, brand name, description, OG tags |
| `components/JsonLd.tsx` | Structured data for Google Knowledge panel |
| `public/robots.txt` | Tells Google what to crawl |
| `app/sitemap.ts` | Helps Google discover all pages |
| `app/page.tsx` | Root page title = just "FinFlow" |
| `public/og-image.png` | Social share preview card |

---

## EXPECTED RESULTS TIMELINE

| Timeframe | What changes |
|-----------|-------------|
| After deploy | `sitemap.xml` and `robots.txt` live |
| 1–3 days | Google re-crawls after Search Console request |
| 1–2 weeks | Title updates to "FinFlow" in search |
| 2–4 weeks | Brand name above link updates to "FinFlow" |
| 4–8 weeks | Starts ranking for "FinFlow" as keyword |

---

## NOTES FOR IMPLEMENTER

- If using **Pages Router** instead of App Router, use `_app.tsx` with `next/head` instead of metadata exports
- Do NOT add `noindex` anywhere — your app is already indexed, keep it open
- The `sitemap.ts` only lists **public pages** — do not include `/dashboard` or auth-protected routes
- Replace `PASTE_YOUR_VERIFICATION_CODE_HERE` with the actual code from Google Search Console
