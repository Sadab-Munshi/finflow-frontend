# Sidebar design system

The app shell navigation lives in `components/layout/sidebar/`. It is a light,
restrained surface that sits beside the dashboard rather than competing with it.

## Files

| File | Responsibility |
|---|---|
| `sidebar-nav.ts` | Single source of truth: `SIDEBAR_PRIMARY_NAV`, `SIDEBAR_ACCOUNT_NAV`, `isNavActive()` (nested paths + `/transaction/[id]` → History, `/privacy-security` + `/backup-restore` → Settings). |
| `useSidebarRail.ts` | Desktop expand/collapse state, breakpoints, persisted preference, `<html data-ff-sidebar>` writes. |
| `PremiumSidebar.tsx` | Desktop `<aside>`: brand, Add action, nav, account footer. |
| `BrandHeader.tsx` | Real FinFlow lockup (expanded) / emblem-only mark (rail), plus the collapse toggle. |
| `SidebarNavList.tsx` | `Link` rows with `aria-current`, active pill, optional portalled tooltips. |
| `AccountMenu.tsx` | Profile footer — `popup` on desktop, `inline` in the drawer. |
| `MobileNavDrawer.tsx` | Radix Dialog drawer: focus trap, Escape, backdrop, scroll lock, focus restore. |
| `AvatarCircle.tsx` | Circular avatar used identically in panel, rail and drawer. |

## Colour tokens

Every text colour was contrast-audited against the surface it actually sits on.

| Token | Value | Contrast |
|---|---|---|
| `--ff-bg` | `#F8FAF9` | sidebar surface |
| `--ff-text` | `#172B2A` | 14.2:1 |
| `--ff-muted` | `#5F736F` | 4.8:1 (4.5:1 on hover wash) |
| `--ff-icon` | `#6F8681` | 3.7:1 (graphical minimum is 3:1) |
| `--ff-label` | `#627772` | 4.6:1 for 9.5px section headings |
| `--ff-active-bg` | `#E5F2EE` | pale teal fill |
| `--ff-active-fg` | `#077569` | 4.9:1 on the active fill |
| `--ff-primary` | `#087F72` | 4.9:1 with white text |
| `--ff-primary-hover` | `#06695F` | 6.6:1 with white text |
| `--ff-line` / `--ff-hover` | `#E5EBE9` / `#EFF4F2` | hairline / hover wash |

No gradients, no glow, no blur. The panel is separated from the dashboard by a
1px border, not a shadow.

## Geometry

| Token | Value |
|---|---|
| `--ff-sidebar-expanded` | `248px` |
| `--ff-sidebar-rail` | `68px` |
| `--ff-row-h` | `42px` (44px inside the drawer, where it is a thumb target) |
| `--ff-icon-px` | `18px` |
| `--ff-pad` / `--ff-row-pad` | `14px` / `11px` — 14 + 11 + 9 = icon centre at **34px in both states** |
| `--ff-dur` / `--ff-ease` | `240ms` / `cubic-bezier(.2,.8,.2,1)` |

`[data-ff-sidebar]` on `<html>` is the only state input. `globals.css` derives
`--ff-sidebar-w` from it, so `.ff-sidebar`'s width and `.ff-main`'s padding-left
animate from one variable and can never drift apart.

## Behaviour per width

| Width | Navigation |
|---|---|
| ≥ 1200px | 248px panel; collapse to 68px; choice persisted in `localStorage['finflow:sidebar']` |
| 900–1199px | 68px rail by default so content keeps its width; expanding is session-only |
| < 900px | 44px menu button + left drawer `min(280px, 100vw - 48px)`; bottom nav unchanged |

A script in `app/layout.tsx` resolves the initial state before `<body>` parses,
so a remembered "collapsed" state never flashes an expanded panel.

## Two things that are easy to break

1. **The avatar must stay circular.** `next/image` renders with an inline
   `position: absolute`. If the rounded, clipping box is `position: static`, the
   image's containing block becomes the nearest *positioned* ancestor and the
   photo paints as a square outside the circle. The wrapper is therefore
   explicitly `position: relative` + `overflow: hidden` + `border-radius`.
2. **Icon alignment.** Collapsed rows hide labels with `position: absolute`
   instead of `display: none`, so the 40px content box stays and the icon keeps
   its 34px centre. Labels also use `text-overflow: ellipsis`, so no label can
   ever wrap mid-transition.

## Accessibility

- `<nav aria-label>` on both surfaces, real `<Link>`s, `aria-current="page"`.
- 40–44px controls, `aria-label` switching between Collapse/Expand, `aria-controls`
  pointing at `#ff-sidebar-nav`, focus following the toggle across states.
- Icon-only rail rows get tooltips that also open on keyboard focus.
- Drawer uses Radix Dialog (focus trap, `aria-modal`, Escape, backdrop, scroll
  lock) plus explicit focus restore to the menu trigger.
- 2px offset focus rings; `outline: none` never appears.
- `prefers-reduced-motion: reduce` collapses every transition to `1ms`.
