# SEO Audit Checklist

Use this when scanning the project in Step 1. Check each item and note: ✅ Present | ❌ Missing | ⚠️ Broken

---

## `app/layout.tsx` Audit

| Item | Check | Notes |
|------|-------|-------|
| `metadataBase` set to full domain | ✅/❌ | Without this, og:image URLs will be relative and break |
| `title.default` includes "Sadab Munshi" | ✅/❌ | Critical for Google brand recognition |
| `title.template` set | ✅/❌ | e.g. `"%s | FinFlow"` |
| `description` is 120–160 chars | ✅/❌ | Include brand name + key value prop |
| `keywords` includes "Sadab Munshi" | ✅/❌ | Helps Google disambiguate the brand |
| `authors` field set | ✅/❌ | |
| `robots` field: index+follow both true | ✅/❌ | |
| `openGraph.url` is full absolute URL | ✅/❌ | |
| `openGraph.images[0].url` is direct `/og-image.png` | ✅/❌ | Must NOT be `_next/image?url=...` |
| `openGraph.images[0].width` = 1200 | ✅/❌ | |
| `openGraph.images[0].height` = 630 | ✅/❌ | |
| `openGraph.locale` = `"en_IN"` | ✅/❌ | |
| `twitter.card` = `"summary_large_image"` | ✅/❌ | |
| `twitter.images` uses direct URL | ✅/❌ | |
| `alternates.canonical` set | ✅/❌ | Prevents duplicate content |
| JSON-LD `<script>` present | ✅/❌ | Critical for Google brand fix |
| JSON-LD `@type` = `"WebApplication"` | ✅/❌ | |
| JSON-LD `name` = `"FinFlow"` | ✅/❌ | |
| JSON-LD `author.name` = `"Sadab Munshi"` | ✅/❌ | |

---

## File System Audit

| File | Expected Location | Check |
|------|------------------|-------|
| OG Image | `public/og-image.png` | 1200×630px, under 300KB |
| Favicon | `public/favicon.ico` | Any size |
| Apple Touch Icon | `public/apple-touch-icon.png` | 180×180px |
| Sitemap | `app/sitemap.ts` | Must export default function |
| Robots | `app/robots.ts` | Must export default function |

---

## `middleware.ts` Audit (if exists)

Check that these paths are NOT being intercepted or redirected:
- `/og-image.png`
- `/sitemap.xml`
- `/robots.txt`
- `/favicon.ico`

The matcher should exclude public static files:
```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|og-image.png).*)"],
};
```

---

## `next.config` Audit

- No `headers()` blocking `/og-image.png`
- No `redirects()` on root path that could break scraper access
- If using `images.domains`, that's fine — OG image should not use `next/image` anyway
