# Sidebar design system

The app shell navigation lives in `components/layout/sidebar/`. It replaces the
old 256px teal `<aside>` that was inlined twice inside `Layout.tsx` (once for the
mobile drawer, once for desktop) and keeps every real destination, its order and
the existing auth/subscription wiring.

## Files

| File | Responsibility |
|---|---|
| `sidebar-nav.ts` | Single source of truth: `SIDEBAR_PRIMARY_NAV`, `SIDEBAR_ACCOUNT_NAV`, `isNavActive()` (nested paths + `/transaction/[id]` → History, `/privacy-security` + `/backup-restore` → Settings). |
| `useSidebarRail.ts` | Desktop expand/collapse state, breakpoints, persisted preference, `<html data-ff-sidebar>` writes. |
| `PremiumSidebar.tsx` | Desktop `<aside>`: brand, Add CTA, nav, account footer. |
| `BrandHeader.tsx` | Logo mark + plan subtitle, both toggle variants (expanded / rail). |
| `SidebarNavList.tsx` | `Link` rows with `aria-current`, active pill + mint indicator, optional portalled tooltips. |
| `AccountMenu.tsx` | Profile footer — `popup` variant on desktop, `inline` variant in the drawer. |
| `MobileNavDrawer.tsx` | Radix Dialog drawer: focus trap, Escape, backdrop, scroll lock, focus restore. |
| `AvatarCircle.tsx` | Shared avatar (photo / initial / Pro crown). |

## Geometry contract

`[data-ff-sidebar="expanded"|"collapsed"]` on `<html>` is the only input. `globals.css`
derives `--ff-sidebar-w` from it, so:

- `.ff-sidebar` animates `width`
- `.ff-main` animates `padding-left`

from the same variable and stay perfectly in sync. Adding a third state means
adding a selector, not new JS.

| Token | Value |
|---|---|
| `--ff-sidebar-expanded` | `272px` |
| `--ff-sidebar-rail` | `72px` |
| `--ff-surface` / `--ff-surface-hi` | `#082F2D` / `#0B3C38` |
| `--ff-mint` | `#72E2BF` |
| `--ff-dur` / `--ff-ease` | `260ms` / `cubic-bezier(.2,.8,.2,1)` |
| nav row height | `44px` (touch-safe, also on rail) |

## Behaviour per width

| Width | Navigation |
|---|---|
| ≥ 1200px | 272px labelled panel; collapse to 72px rail; choice persisted in `localStorage['finflow:sidebar']` |
| 900–1199px | 72px rail by default so content keeps its width; expanding is session-only |
| < 900px | 24/44px menu button + left drawer `min(288px, 100vw - 48px)`; bottom nav unchanged |

The first paint is decided by a small inline script in `app/layout.tsx` that runs
before `<body>` is parsed, so a remembered "collapsed" state never flashes an
expanded panel. `useSidebarRail` mirrors that logic after hydration.

## Accessibility

- `<nav aria-label>` on both surfaces, real `<Link>`s, `aria-current="page"` on the
  active row.
- 44×44 toggle, `aria-label` switches between Collapse/Expand, `aria-controls`
  points at `#ff-sidebar-nav`, focus follows the toggle across states.
- Icon-only rail rows get portalled tooltips that also open on keyboard focus.
- Drawer: Radix Dialog (focus trap, `aria-modal`, Escape, backdrop, scroll lock)
  plus explicit focus restore to the menu trigger.
- 2px offset focus rings everywhere — no `outline: none`.
- `prefers-reduced-motion: reduce` collapses every transition/animation to `1ms`.
