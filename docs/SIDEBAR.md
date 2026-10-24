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

## Refinement pass — stability, PRO, and the drawer's three regions

The visual system above is unchanged. What changed is behaviour and a few
missing states.

**Landscape scroll stability.** The panel used to be pinned with `top: 0;
bottom: 0`, which sizes a fixed box against the *initial containing block* — the
large viewport. On a tablet in landscape the account block therefore sat below
the fold while the browser's address bar was showing, then jumped into view as
the bar collapsed during a scroll. It is now `height: 100dvh` (with a `100vh`
fallback), so the three regions track the visible viewport. `translateZ(0)`
gives the panel its own compositor layer so a long, fast-scrolling document
cannot drag its repaint with it, and the resize handler ignores height-only
viewport changes (address-bar collapse) — only a width change re-evaluates the
layout. No scroll listeners, no JS positioning.

**The drawer is three regions, not one sheet.** `.ff-drawer` is
`overflow: hidden`; the brand row and account block are `flex: 0 0 auto`, and
only `.ff-nav` scrolls (`flex: 1 1 auto; min-height: 0; overscroll-behavior:
contain`). At 360px of height the whole sheet used to scroll, so a fast swipe
carried the logo and the account block off screen.

**PRO avatar.** `AvatarCircle` takes `isPro` and paints
`outline: 1.5px solid #C9A45C; outline-offset: 2px`. An `outline` is the only
mechanism that adds a ring *outside* the crop with a real gap: a border would
eat into the 32px photo, and a nested element would either be clipped by
`overflow: hidden` or sit on top of the image. Free accounts get
`box-shadow: 0 0 0 1px var(--ff-line)` instead, and the `PRO` chip next to the
name is rendered only while the entitlement is live. Both read the same
`isPro` as the rest of the shell.

**One sign-out dialog.** `components/auth/SignOutDialog.tsx` is the only code
path that calls `supabase.auth.signOut` for a user-initiated sign-out. The
sidebar menu, the dashboard button and the profile screen all open it; it
`preventDefault()`s Radix's auto-close so the dialog survives the request, and
an `inFlight` ref stops a double tap from firing twice.

**The mobile drawer is identity only.** No Add button (the floating action is
always behind the drawer), no Edit Profile, no Sign Out — those stay on the
desktop menu and the Profile screen. The close control is the same
`PanelLeftClose` glyph as the desktop toggle, labelled "Close navigation".

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

## Post-Phase-C test coverage

`__tests__/sidebar-refinement.test.mjs` asserts, against source:

- the confirmation dialog's exact copy, that it is the only user-initiated
  `signOut` caller, and that duplicates and in-flight dismissal are blocked;
- the PRO ring is entitlement-driven, `#C9A45C`, and never a border;
- the drawer has no Add button and no account actions, uses `PanelLeftClose`
  with "Close navigation", and pins brand/nav/account as three regions;
- the panel uses `100dvh`, no ICB sizing, and its own compositor layer;
- the FAB stack paints above the bell but below the drawer, and the dial is
  capped to the visible viewport;
- every light-theme token, breakpoint and geometry value is untouched.

## Layout architecture — viewport lock and a single scroll canvas

The shell was rebuilt around one rule: **the document never scrolls inside the
app.** Everything below follows from it.

```
.ff-shell          height: 100dvh; overflow: hidden; display: flex
├── .ff-sidebar    flex: 0 0 auto  →  header / nav / profile
└── .ff-canvas     flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain
    ├── .ff-topbar  global utility header (sticky inside the canvas)
    └── main.ff-main ─ page content
```

**Why the sidebar was wobbly.** It used to be `position: fixed` while the
*document* scrolled behind it. A fixed element and a scrolling document share a
compositor layer; mobile browsers repaint both together, so the panel visibly
lagged and shifted during fast momentum scrolling — worst in landscape, where
the address bar also changes the viewport mid-scroll. The panel is now an
ordinary flex child of a clipped viewport, so it and the dashboard never share
a scroll container and cannot scroll relative to each other.

**Root locking is scoped.** `html:has(.ff-shell)` / `body:has(.ff-shell)`
receive `height: 100%; overflow: hidden`. The landing page, auth screens and
legal pages keep normal document scrolling — pull-to-refresh on the marketing
site still works.

**Height comes from flex, not from the viewport.** `.ff-shell` is `100dvh`
(`100vh` fallback). The panel fills it at `height: 100%`, so an expanding or
collapsing address bar resizes the shell and both children together with no
reflow of the panel's internal structure.

**Three regions, by flexbox.** `.ff-head` and `.ff-foot` are `flex: 0 0 auto`;
`.ff-nav` is `flex: 1 1 auto; min-height: 0; overflow-y: auto`. The profile card
is pinned by layout, never by `position: absolute` or a viewport rule. Settings
staying behind a scroll in the nav is intended, not a bug.

**Paint isolation.** `.ff-sidebar` carries `contain: layout paint` plus
`transform: translateZ(0)` for its own GPU layer, so nothing inside it can be
recalculated or repainted by the canvas scrolling. `.ff-nav` — the only region
whose contents can change size — carries the same pair.

Paint containment clips every descendant to the panel's padding box. Two
overlays legitimately live outside that box, and both are portalled rather than
clipped:

- **Tooltips** (rail icon hints) are portalled by Radix.
- **The rail account menu** is 208px wide and cannot fit inside a 68px rail.
  `AccountMenu` takes a `portalled` flag that `PremiumSidebar` sets only when
  collapsed; the popup renders into `<body>`, anchored to the panel's right
  edge from the trigger's rect. Because the shell is viewport-locked and the
  panel never moves relative to it, the anchor is measured once on open — no
  scroll listener. A *width* change closes the menu rather than tracking it.

**No scroll JavaScript.** There is no `scroll` listener, no `scrollY` read and
no scroll-driven style anywhere in the app (`__tests__/layout-architecture.test.mjs`
enforces this). The utility header is `position: sticky` inside the canvas.
The one imperative line is `canvas.scrollTop = 0` on route change, replacing
what the browser used to do for free when the window was the scroller.

## Global utility header

`components/layout/AppTopBar.tsx` sits at the top of the canvas, so global
controls can never cover page controls again — the notification bell used to
float over the dashboard's "This Month / All Time" toggle at every width.

| Viewport | Contents |
|---|---|
| < 900px | hamburger + notifications (both `.ff-icon-btn`, 44px) |
| ≥ 900px | transaction search + settings + notifications + avatar (38px) |

The bell is no longer on a teal primary fill: it is a neutral surface with the
same border, radius and hover as the hamburger, so the two ends of the phone
header are symmetric and the icon no longer competes with the page title. The
red unread counter keeps its size, colour and position, with a white ring so it
stays legible on the neutral surface.

Search routes to `/history?q=…`, and history now matches the visible fields
(`note`, `category`) rather than `note` alone — before this, searching a
merchant name that was plainly on screen returned nothing.

## Action deduplication

The floating action button is phone-only (`min-[900px]:hidden`), along with its
backdrop. From 900px up, the sidebar's Add control — full-width in the panel,
icon + tooltip in the rail — is the single creation entry point.
