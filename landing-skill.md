---
name: finflow-mobile-ui-fix
description: >
  Fixes mobile layout issues on FinFlow landing page: hero headline line breaks,
  navbar height, responsive hero image sizing, and footer copyright text.
  Trigger when user asks to fix mobile view, hero text wrapping, navbar too tall,
  image not responsive, or footer copyright changes.
---

# FinFlow Mobile UI Fix — GitHub Copilot Agent

You have full repo access. Read files first, then edit directly.
Target files:
- `app/(landing)/page.tsx`
- `app/(landing)/layout.tsx` OR `components/landing/LandingShell.tsx`

---

## STEP 1 — Scan Files First

Read these files fully before touching anything:
- `app/(landing)/page.tsx` — hero section, headline, image
- `app/(landing)/layout.tsx` OR `components/landing/LandingShell.tsx` — navbar, footer

Confirm you can see:
- `<h1>` with "Spend less time counting, more time living"
- `<Image src="/hero-dashboard.webp"` in hero
- Navbar `<nav>` with `py-2.5` padding
- Footer copyright line

---

## STEP 2 — Fix Hero Headline (`app/(landing)/page.tsx`)

### Problem
On mobile, "Spend less time counting," breaks across 3 lines awkwardly.
It should read as TWO clean lines:
- Line 1: "Spend less time counting,"
- Line 2: "more time living"

### Fix
Find the current h1:
```tsx
<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-neutral-900 tracking-tight leading-tight mb-6 reveal">
  Spend less time counting,
  <br />
  more time living
</h1>
```

Replace with:
```tsx
<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-neutral-900 tracking-tight leading-tight mb-6 reveal">
  <span className="block">Spend less time counting,</span>
  <span className="block">more time living</span>
</h1>
```

> Using `<span className="block">` forces each phrase onto its own line
> at ALL screen sizes — no awkward mid-word breaks on mobile.

---

## STEP 3 — Fix Hero Image Responsive Sizing (`app/(landing)/page.tsx`)

### Problem
Hero image is fixed size — too large or too small depending on device.
Needs to scale properly: small on mobile, larger on tablet, full on desktop.

### Fix
Find the current hero Image:
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

Replace with:
```tsx
<Image
  src="/hero-dashboard.webp"
  alt="FinFlow dashboard showing total balance of ₹2,58,750 with expense overview chart, spending categories breakdown and recent transactions"
  width={700}
  height={493}
  className="w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto mb-8 drop-shadow-xl rounded-2xl"
  priority={true}
  quality={85}
/>
```

**Breakpoint sizes:**
| Screen | Max Width | Device |
|--------|-----------|--------|
| default (mobile) | 280px | Small phones |
| sm (640px+) | 384px | Large phones |
| md (768px+) | 448px | Tablets |
| lg (1024px+) | 512px | Laptops |
| xl (1280px+) | 576px | Desktops |

---

## STEP 4 — Reduce Navbar Height

### Problem
Navbar container feels tall on mobile. Needs slightly less padding.

### Fix
Find the navbar `<nav>` element. It will have `py-2.5` in its className:

```tsx
className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-2.5 ...`}
```

Replace `py-2.5` with `py-1.5 sm:py-2.5`:
```tsx
className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-1.5 sm:py-2.5 ...`}
```

Also find the logo Image height — it uses `className="h-8 w-auto"`.
Change to `className="h-7 sm:h-8 w-auto"` for slightly smaller logo on mobile:

```tsx
<Image
  src="/finflow-logo.png"
  alt="FinFlow – Smart Finance Tracker"
  width={120}
  height={38}
  className="h-7 sm:h-8 w-auto object-contain"
  priority
/>
```

---

## STEP 5 — Fix Footer Copyright

### Problem
Footer currently shows: `© 2026 FinFlow by Sadab Munshi. All rights reserved.`
User wants: `© 2026 FinFlow. All rights reserved.` — no name.

### Fix
Find in footer:
```tsx
© 2026 FinFlow by Sadab Munshi. All rights reserved.
```

Replace with:
```tsx
© 2026 FinFlow. All rights reserved.
```

---

## STEP 6 — Self Verify

After all edits confirm:

```
✅ h1 uses <span className="block"> for each line — no mid-word breaks
✅ Hero image uses responsive max-w classes: max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg
✅ Navbar py changed to py-1.5 sm:py-2.5
✅ Logo height changed to h-7 sm:h-8
✅ Footer shows "© 2026 FinFlow. All rights reserved." — no name
✅ No other sections touched
```

---

## STEP 7 — Report

```
## ✅ Mobile UI Fixes Applied

- app/(landing)/page.tsx
  → h1 headline: now uses <span className="block"> for clean 2-line break
  → Hero image: responsive sizing xs→xl breakpoints

- layout.tsx / LandingShell.tsx
  → Navbar: py-1.5 on mobile, py-2.5 on sm+
  → Logo: h-7 on mobile, h-8 on sm+
  → Footer: removed name, shows "© 2026 FinFlow. All rights reserved."

No other changes made.
```
