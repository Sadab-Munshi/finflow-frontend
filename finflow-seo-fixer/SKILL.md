---
name: finflow-seo-fixer
description: >
  Scans and directly edits all SEO, Open Graph, metadata, structured data,
  sitemap, robots, and performance issues in this Next.js App Router project
  (FinFlow by Sadab Munshi). Trigger this skill when the user asks to fix SEO,
  OG image not showing, Google brand issues, missing sitemap/robots, meta tags,
  JSON-LD, or any search engine visibility problem.
---

# FinFlow SEO Fixer — GitHub Copilot Agent

You have full access to this repository. **Do not just suggest changes — read the files, then edit them directly.**

Work through every step below in order. Do not skip steps.

---

## STEP 1 — Scan the Repo

Read these files now before touching anything:

```
app/layout.tsx
app/page.tsx
app/sitemap.ts          (may not exist)
app/robots.ts           (may not exist)
middleware.ts           (may not exist)
next.config.js OR next.config.ts
public/                 (list all files)
package.json
```

While scanning, build an audit against `references/audit-checklist.md`.
Note every item that is: ✅ correct | ❌ missing | ⚠️ broken.

Do not proceed to Step 2 until you have read all files above.

---

## STEP 2 — Fix `app/layout.tsx`

This is the most critical file. Apply all fixes directly.

### 2a — Replace metadata export

Open `app/layout.tsx`. Find the existing `metadata` export.
Replace it entirely with the template from `references/metadata-templates.md` → **"Full Metadata Export"**.

**Critical rules while editing:**
- `metadataBase` MUST be set to `new URL("https://app.sadabmunshi.online")`
- `openGraph.images[0].url` MUST be `"https://app.sadabmunshi.online/og-image.png"` — a direct path, never `/_next/image?url=...`
- `title.default` MUST contain both "FinFlow" and "Sadab Munshi"
- Do NOT remove any existing imports or other exports while editing

### 2b — Add JSON-LD structured data

Still in `app/layout.tsx`, find the `RootLayout` function.
If a `<script type="application/ld+json">` block does not already exist inside `<head>`, add it.
Use the template from `references/metadata-templates.md` → **"JSON-LD"**.

---

## STEP 3 — Create `app/sitemap.ts`

Check if `app/sitemap.ts` exists.

- **If it does not exist** → create it using template from `references/metadata-templates.md` → **"Sitemap"**
- **If it exists** → read it and verify it exports a valid `MetadataRoute.Sitemap`. Fix if broken.

---

## STEP 4 — Create `app/robots.ts`

Check if `app/robots.ts` exists.

- **If it does not exist** → first list all directories under `app/` to identify private routes, then create `app/robots.ts` using the template from `references/metadata-templates.md` → **"Robots"**
- **If it exists** → read it and confirm:
  - `/og-image.png` is NOT in the disallow list
  - `/` root is NOT disallowed
  - Sitemap URL is `https://app.sadabmunshi.online/sitemap.xml`

---

## STEP 5 — Fix `middleware.ts` (if it exists)

Open `middleware.ts`. Check the `matcher` config.

If `/og-image.png`, `/sitemap.xml`, or `/robots.txt` are NOT excluded from the matcher, update it using the template from `references/metadata-templates.md` → **"Middleware Fix"**.

If `middleware.ts` does not exist, skip this step.

---

## STEP 6 — Verify `public/og-image.png`

Check that `public/og-image.png` exists in the repo.

- **If it exists** → good, no action needed
- **If it does not exist** → do NOT create a placeholder. Stop and tell the user:
  > "⚠️ `public/og-image.png` is missing. Please add your OG image (1200×630px, under 300KB) to the `/public` folder before deploying."

---

## STEP 7 — Self-Verify All Changes

After all edits, read back every changed file and confirm:

```
✅ metadataBase is set in layout.tsx
✅ og:image URL is direct /og-image.png (not _next/image)
✅ openGraph title includes "Sadab Munshi"
✅ JSON-LD script block exists with name="FinFlow" and author="Sadab Munshi"
✅ app/sitemap.ts exists and exports correctly
✅ app/robots.ts exists and does not disallow og-image.png
✅ middleware.ts (if exists) excludes og-image.png from matcher
```

Flag anything that couldn't be fixed with a clear ⚠️ note.

---

## STEP 8 — Report to User

Give the user a clean final summary:

```
## ✅ SEO Fixes Applied

### Files Edited:
- app/layout.tsx — [describe what changed]
- app/sitemap.ts — [created / already existed / fixed]
- app/robots.ts  — [created / already existed / fixed]
- middleware.ts  — [updated / skipped — not found]

### ⚠️ Manual Steps Required (cannot be done in code):
1. Google Search Console
   → Add property: https://app.sadabmunshi.online
   → Submit sitemap: https://app.sadabmunshi.online/sitemap.xml
   → Get verification code → add to metadata.verification.google

2. Force WhatsApp/Facebook cache clear
   → https://developers.facebook.com/tools/debug/
   → Paste URL → click "Scrape Again"

3. Timeline
   → OG image fix: immediate after deploy
   → Google "did you mean sadaf" fix: 2–4 weeks after Search Console + JSON-LD live
```

---

## Reference Files

- `references/audit-checklist.md` — Full scan checklist used in Step 1
- `references/metadata-templates.md` — All ready-to-paste code used in Steps 2–5
