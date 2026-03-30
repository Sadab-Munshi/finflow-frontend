# Metadata Templates — FinFlow

Ready-to-paste code. Use only what's missing — don't blindly overwrite existing fields.

---

## Full Metadata Export

Paste into `app/layout.tsx`. Replace existing `metadata` export entirely if it's incomplete:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.sadabmunshi.online"),

  title: {
    default: "FinFlow | Smart Finance Tracker by Sadab Munshi",
    template: "%s | FinFlow",
  },

  description:
    "Track every rupee effortlessly — by voice, camera or text. FinFlow is your AI-powered personal finance tracker by Sadab Munshi, available in your language.",

  keywords: [
    "FinFlow",
    "Sadab Munshi",
    "expense tracker",
    "personal finance",
    "rupee tracker",
    "AI finance app",
    "voice expense tracker",
    "finance tracker India",
    "sadab munshi app",
  ],

  authors: [{ name: "Sadab Munshi", url: "https://app.sadabmunshi.online" }],
  creator: "Sadab Munshi",
  publisher: "Sadab Munshi",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },

  openGraph: {
    type: "website",
    url: "https://app.sadabmunshi.online",
    siteName: "FinFlow",
    title: "FinFlow | Smart Finance Tracker by Sadab Munshi",
    description:
      "Track every rupee — by voice, camera or text. Free, secure, and available in your language.",
    images: [
      {
        url: "https://app.sadabmunshi.online/og-image.png", // ← direct path, never _next/image
        width: 1200,
        height: 630,
        alt: "FinFlow – Smart personal finance tracker by Sadab Munshi",
        type: "image/png",
      },
    ],
    locale: "en_IN",
  },

  twitter: {
    card: "summary_large_image",
    title: "FinFlow | Smart Finance Tracker by Sadab Munshi",
    description:
      "Track every rupee — by voice, camera or text. Free, secure, and available in your language.",
    images: ["https://app.sadabmunshi.online/og-image.png"],
    creator: "@sadabmunshi",
  },

  alternates: {
    canonical: "https://app.sadabmunshi.online",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },

  // Add after getting code from Google Search Console
  // verification: {
  //   google: "YOUR_VERIFICATION_CODE",
  // },
};
```

---

## JSON-LD

Add inside `RootLayout` component in `app/layout.tsx`, inside `<head>`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "FinFlow",
    alternateName: ["Sadab Munshi App", "sadab munshi finflow"],
    url: "https://app.sadabmunshi.online",
    description:
      "Track every rupee effortlessly by voice, camera or text. AI-powered personal finance tracker by Sadab Munshi.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, Android, iOS",
    inLanguage: ["en", "hi", "bn"],
    author: {
      "@type": "Person",
      name: "Sadab Munshi",
      url: "https://app.sadabmunshi.online",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## Sitemap

Create `app/sitemap.ts`:

```typescript
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://app.sadabmunshi.online",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    // Add more routes here as your app grows
    // {
    //   url: "https://app.sadabmunshi.online/dashboard",
    //   lastModified: new Date(),
    //   changeFrequency: "weekly",
    //   priority: 0.8,
    // },
  ];
}
```

---

## Robots

Create `app/robots.ts`:

```typescript
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",   // ← adjust to your actual private routes
          "/_next/",
        ],
      },
    ],
    sitemap: "https://app.sadabmunshi.online/sitemap.xml",
  };
}
```

> ⚠️ Before applying: run `find app/ -type d` to list all route directories.
> Only disallow routes that are truly private (auth-protected pages, API routes).
> Never disallow `/` or `/og-image.png`.

---

## Middleware Fix (if middleware.ts exists)

Ensure `/og-image.png` and other public files bypass middleware:

```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|og-image.png|apple-touch-icon.png|sitemap.xml|robots.txt).*)",
  ],
};
```

---

## Google Search Console Verification

After getting your verification code from Search Console, add to metadata:

```typescript
verification: {
  google: "abc123yourcodehere",
},
```
