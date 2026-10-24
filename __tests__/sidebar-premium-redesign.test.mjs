import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const exists = rel => fs.existsSync(path.join(ROOT, rel))

const NAV = 'components/layout/sidebar/sidebar-nav.ts'
const RAIL = 'components/layout/sidebar/useSidebarRail.ts'
const PANEL = 'components/layout/sidebar/PremiumSidebar.tsx'
const BRAND = 'components/layout/sidebar/BrandHeader.tsx'
const LIST = 'components/layout/sidebar/SidebarNavList.tsx'
const ACCOUNT = 'components/layout/sidebar/AccountMenu.tsx'
const AVATAR = 'components/layout/sidebar/AvatarCircle.tsx'
const DRAWER = 'components/layout/sidebar/MobileNavDrawer.tsx'
const LAYOUT = 'components/layout/Layout.tsx'
const CSS = 'app/globals.css'
const ROOT_LAYOUT = 'app/layout.tsx'

test('Sidebar — light neutral design system', async t => {
  const css = read(CSS)

  await t.test('surface is a calm neutral, not a dark panel', () => {
    assert.match(css, /--ff-bg: #f8faf9/, 'sidebar background is the light neutral')
    assert.match(css, /--ff-text: #172b2a/, 'primary text token')
    assert.match(css, /--ff-muted: #5f736f/, 'secondary text token')
    assert.match(css, /--ff-active-bg: #e5f2ee/, 'pale teal active fill')
    assert.match(css, /--ff-active-fg: #077569/, 'brand teal active foreground')
    assert.match(css, /--ff-primary: #087f72/, 'primary action teal')
    assert.match(css, /--ff-primary-hover: #06695f/, 'primary action hover')
    assert.ok(!css.includes('#082f2d'), 'the old dark emerald surface is gone')
    assert.ok(!css.includes('#0b3c38'), 'the old dark gradient endpoint is gone')
    assert.ok(!css.includes('--ff-mint'), 'the neon mint accent is gone')
  })

  await t.test('no gradients, glow, blur or glassmorphism in the sidebar', () => {
    const sidebarBlock = css.slice(css.indexOf('.ff-sidebar {'), css.indexOf('/* ── Brand header'))
    assert.ok(!sidebarBlock.includes('gradient'), 'sidebar surface has no gradient')
    assert.ok(!sidebarBlock.includes('backdrop-filter'), 'no glassmorphism')
    assert.ok(!sidebarBlock.includes('blur('), 'no blur filters')
    assert.match(sidebarBlock, /border-right: 1px solid var\(--ff-line\)/, 'a hairline border separates the panel')
    assert.ok(!/box-shadow:\s*\d+px/.test(sidebarBlock), 'no heavy drop shadow on the panel')
  })

  await t.test('geometry matches the spec: 248px expanded, 68px rail', () => {
    assert.match(css, /--ff-sidebar-expanded: 248px/, 'expanded width')
    assert.match(css, /--ff-sidebar-rail: 68px/, 'rail width')
    assert.match(css, /--ff-row-h: 42px/, 'navigation row height in the 42-44px band')
    assert.match(css, /--ff-icon-px: 18px/, 'icons sit in the 18-20px band')
  })

  await t.test('a single icon axis in both states', () => {
    // 14px panel padding + 11px row padding = 25 -> 18px glyph centred on 34px
    assert.match(css, /--ff-pad: 14px/, 'panel padding')
    assert.match(css, /--ff-row-pad: 11px/, 'row padding')
    assert.match(css, /\[data-ff-sidebar="collapsed"\] \.ff-sidebar \.ff-nav-row,\s*\[data-ff-sidebar="collapsed"\] \.ff-sidebar \.ff-profile \{\s*justify-content: center;/, 'rail centres rows on the same axis')
  })
})

test('Sidebar — logo and branding', async t => {
  const brand = read(BRAND)
  const css = read(CSS)

  await t.test('the real lockup is used at its native aspect ratio', () => {
    assert.match(brand, /src="\/images\/finflow-logo-tight\.png"/, 'brand uses the shipped FinFlow lockup')
    assert.match(brand, /width=\{97\}\s*height=\{30\}/, 'aspect ratio preserved (3.23:1)')
    assert.match(css, /\.ff-logo \{[\s\S]{0,120}height: 30px;[\s\S]{0,80}width: auto;/, 'height fixed, width auto — never stretched')
    assert.match(css, /\.ff-logo \{[\s\S]{0,220}object-fit: contain/, 'contain keeps the artwork undistorted')
    assert.ok(exists('public/images/finflow-logo-tight.png'), 'tight lockup asset ships')
    assert.ok(exists('public/images/finflow-mark.png'), 'emblem-only mark ships for the rail')
  })

  await t.test('no decorative frame around the logo', () => {
    const markRule = css.slice(css.indexOf('.ff-mark {'), css.indexOf('.ff-brand-link:focus-visible'))
    assert.match(markRule, /width: 30px;/, 'mark is sized directly')
    assert.ok(!markRule.includes('background'), 'no circle or plate behind the mark')
    assert.ok(!markRule.includes('box-shadow'), 'no glow behind the mark')
  })

  await t.test('collapse control sits at the opposite end', () => {
    assert.match(brand, /className="ff-toggle"/, 'toggle rendered in the header row')
    assert.match(css, /\.ff-head \{[\s\S]{0,120}display: flex;[\s\S]{0,200}gap: 8px;/, 'header is a flex row')
    assert.match(css, /\.ff-brand-link \{[\s\S]{0,160}flex: 1 1 auto;/, 'brand takes the space, toggle sits right')
  })
})

test('Sidebar — user avatar is a true circular crop', async t => {
  const avatar = read(AVATAR)
  const css = read(CSS)

  await t.test('the clipping box is positioned, rounded and hidden', () => {
    // Regression guard: with a `position: static` wrapper, next/image's inline
    // `position: absolute` resolves against an un-rounded ancestor and the photo
    // paints as a square.
    assert.match(avatar, /position: 'relative'/, 'avatar wrapper is positioned')
    assert.match(avatar, /overflow: 'hidden'/, 'avatar wrapper clips')
    assert.match(avatar, /borderRadius: '9999px'/, 'avatar wrapper is fully round')
  })

  await t.test('the image itself is covered, centred and rounded', () => {
    assert.match(avatar, /objectFit: 'cover'/, 'object-fit cover (not letterboxed)')
    assert.match(avatar, /objectPosition: 'center'/, 'centred crop')
    assert.match(avatar, /borderRadius: '9999px'/, 'image carries its own radius as a second guard')
    assert.match(avatar, /width=\{size\}\s*height=\{size\}/, 'square intrinsic box, no distortion')
  })

  await t.test('used identically in every surface', () => {
    assert.match(read(ACCOUNT), /<AvatarCircle name=\{name\} avatarUrl=\{avatarUrl\} size=\{32\} isPro=\{isPro\} \/>/, 'shared component in panel + drawer')
    assert.ok(!read(ACCOUNT).includes('Crown'), 'no oversized gold crown badge remains')
    assert.ok(!css.includes('ring-2 ring-amber-400'), 'no amber ring treatment remains')
  })
})

test('Sidebar — navigation and active state', async t => {
  const nav = read(NAV)
  const list = read(LIST)
  const css = read(CSS)

  await t.test('all real destinations preserved, nothing invented', () => {
    for (const href of ['/dashboard', '/history', '/budgets', '/insights', '/analytics', '/reports', '/subscription', '/settings']) {
      assert.ok(nav.includes(`path: '${href}'`), `${href} is wired`)
    }
    assert.ok(!nav.includes("'#'"), 'no placeholder links')
    assert.ok(!nav.includes('/accounts'), 'no invented routes')
  })

  await t.test('active vs hover are visually distinct', () => {
    const active = css.slice(css.indexOf('.ff-nav-row--active,'), css.indexOf('.ff-nav-label {'))
    assert.match(active, /background: var\(--ff-active-bg\)/, 'active uses the pale teal fill')
    assert.match(active, /color: var\(--ff-active-fg\)/, 'active uses brand teal text')
    assert.match(active, /font-weight: 600/, 'active is slightly heavier')
    assert.match(css, /\.ff-nav-row:hover \{ background: var\(--ff-hover\); color: var\(--ff-text\); \}/, 'hover is a neutral wash')
    assert.ok(!css.includes('ff-nav-bar'), 'the heavy left indicator block is gone')
  })

  await t.test('route awareness survives nested paths', () => {
    assert.match(nav, /pathname\.startsWith\(`\$\{path\}\/`\)/, 'nested segments activate the parent')
    assert.match(nav, /'\/history': \['\/transaction'\]/, '/transaction/[id] lights History')
    assert.match(nav, /'\/settings': \['\/privacy-security', '\/backup-restore'\]/, 'settings sub-pages light Settings')
    assert.match(list, /aria-current=\{active \? 'page' : undefined\}/, 'aria-current="page" on the active row')
  })
})

test('Sidebar — primary action', async t => {
  const css = read(CSS)

  await t.test('compact deep teal button, not a bright mint block', () => {
    const cta = css.slice(css.indexOf('.ff-cta {'), css.indexOf('.ff-cta svg'))
    assert.match(cta, /background: var\(--ff-primary\)/, 'deep teal fill')
    assert.match(cta, /color: #ffffff/, 'white label')
    assert.match(cta, /height: 38px/, 'compact height (was 44px+)')
    assert.match(cta, /border-radius: 9px/, 'subtle radius')
    assert.ok(!cta.includes('box-shadow'), 'no glow on the primary action')
    assert.ok(!cta.includes('gradient'), 'flat colour, no gradient')
  })

  await t.test('rail state is a centred plus with a tooltip', () => {
    assert.match(css, /\[data-ff-sidebar="collapsed"\] \.ff-sidebar \.ff-cta \{\s*justify-content: center;/, 'icon centred in the rail')
    assert.match(read(PANEL), /<Tooltip.Trigger asChild>\{addLink\}<\/Tooltip.Trigger>/, 'rail Add button gets a tooltip')
    assert.match(read(PANEL), /href="\/add\?tab=manual"/, 'existing action preserved')
  })
})

test('Sidebar — motion', async t => {
  const css = read(CSS)

  await t.test('width and offset animate together on one curve', () => {
    assert.match(css, /--ff-dur: 240ms/, 'duration inside 220-260ms')
    assert.match(css, /--ff-ease: cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/, 'smooth ease-out')
    assert.match(css, /\.ff-sidebar \{[\s\S]{0,400}transition: width var\(--ff-dur\)/, 'panel animates width')
    assert.match(css, /\.ff-main \{[\s\S]{0,200}padding-left: var\(--ff-sidebar-w\)/, 'content offset reads the same variable')
    assert.match(css, /\.ff-main[\s\S]{0,120}transition: padding-left var\(--ff-dur\)/, 'offset animates in sync')
  })

  await t.test('labels fade and translate, never reflow', () => {
    assert.match(css, /\.ff-nav-label \{[\s\S]{0,220}transition: opacity 120ms/, 'label fades')
    assert.match(css, /translateX\(-4px\)/, 'label translates 4px')
    assert.match(css, /text-overflow: ellipsis/, 'long labels truncate instead of wrapping')
    assert.ok(!/\btransition:\s*all\b/.test(css), 'never transitions every property')
  })

  await t.test('reduced motion is honoured', () => {
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    assert.match(block, /transition-duration: 1ms !important/, 'transitions collapse')
    assert.match(block, /animation-duration: 1ms !important/, 'animations collapse')
  })
})

test('Sidebar — responsive structure', async t => {
  const layout = read(LAYOUT)
  const css = read(CSS)
  const rail = read(RAIL)

  await t.test('breakpoints and persisted preference', () => {
    assert.match(rail, /SIDEBAR_WIDE_BREAKPOINT = 1200/, 'wide desktop threshold')
    assert.match(rail, /SIDEBAR_DESKTOP_BREAKPOINT = 900/, 'drawer threshold')
    assert.match(rail, /readPreference\(\)/, 'wide screens restore the stored choice')
    assert.match(rail, /compactExpandedRef\.current\s*\?\s*'expanded'\s*:\s*'collapsed'/, 'compact screens default to the rail')
    assert.match(read(ROOT_LAYOUT), /setAttribute\('data-ff-sidebar', state\)/, 'pre-paint bootstrap writes the attribute')
    assert.ok(read(ROOT_LAYOUT).indexOf('data-ff-sidebar') < read(ROOT_LAYOUT).indexOf('<body'), 'bootstrap runs in <head>')
  })

  await t.test('drawer is light, 280px, and cannot cause page overflow', () => {
    assert.match(css, /width: min\(280px, calc\(100vw - 48px\)\)/, 'drawer width rule')
    const drawer = css.slice(css.indexOf('.ff-drawer {'), css.indexOf('.ff-drawer[data-state="open"]'))
    assert.match(drawer, /background: #ffffff/, 'drawer uses the light surface')
    assert.ok(!drawer.includes('gradient'), 'no dark gradient panel')
    assert.match(css, /\.ff-drawer-overlay \{[\s\S]{0,120}background: rgba\(19, 38, 36, 0\.3\)/, 'soft dimmed backdrop')
    assert.match(css, /\.ff-drawer \.ff-nav-row \{ height: 44px; \}/, 'drawer rows meet the 44px touch target')
  })

  await t.test('short viewports keep account actions reachable', () => {
    assert.match(css, /height: 100dvh/, 'mobile chrome accounted for')
    assert.match(css, /padding: env\(safe-area-inset-top\)[^;]*safe-area-inset-bottom/, 'safe-area insets')
    assert.match(css, /overscroll-behavior: contain/, 'independent scrolling')
    assert.match(css, /@media \(min-width: 900px\) and \(max-height: 660px\)/, 'compact height tuning')
  })

  await t.test('single sidebar + drawer instances; old shell offset gone', () => {
    assert.equal((layout.match(/<PremiumSidebar/g) || []).length, 1, 'one desktop sidebar')
    assert.equal((layout.match(/<MobileNavDrawer/g) || []).length, 1, 'one drawer')
    assert.ok(!layout.includes('md:ml-64'), 'stale md:ml-64 offset removed')
    assert.ok(!layout.includes('w-64 bg-gradient-to-b from-teal-700'), 'old teal aside removed')
  })
})

test('Sidebar — accessibility', async t => {
  const css = read(CSS)
  const panel = read(PANEL)
  const drawer = read(DRAWER)
  const account = read(ACCOUNT)

  await t.test('semantics, labels and focus rings', () => {
    assert.match(panel, /aria-label=\{t\('primaryNav'\)\}/, 'labelled nav landmark')
    assert.match(drawer, /Dialog\.Title className="sr-only"/, 'drawer accessible title')
    assert.match(account, /aria-haspopup="true"/, 'profile button exposes its popup')
    assert.match(account, /role="menuitem"/, 'menu items carry roles')
    assert.match(read(BRAND), /aria-label=\{t\('collapseNav'\)\}/, 'toggle labelled Collapse navigation')
    assert.match(read(BRAND), /aria-label=\{t\('expandNav'\)\}/, 'toggle labelled Expand navigation')
    assert.match(read(BRAND), /aria-controls="ff-sidebar-nav"/, 'toggle points at the nav')
    assert.ok(!/outline:\s*none/.test(css), 'focus outlines never suppressed')
  })

  await t.test('drawer focus management', () => {
    assert.match(drawer, /onCloseAutoFocus=\{event => \{[\s\S]{0,600}trigger\.focus\(\{ preventScroll: true \}\)/, 'focus restored to the trigger')
    assert.match(read(LAYOUT), /if \(window\.innerWidth >= 900\) setDrawerOpen\(false\)/, 'stale drawer cleared on resize')
    assert.match(read(LIST), /tooltips \? \(/, 'icon-only rail rows get tooltips')
  })
})

test('Sidebar — app behaviour preserved', async t => {
  const layout = read(LAYOUT)

  await t.test('auth, gating, notifications and FAB intact', () => {
    assert.match(read('components/auth/SignOutDialog.tsx'), /auth\.signOut\(\{ scope: 'local' \}\)/, 'sign out preserved behind the confirmation')
    assert.match(layout, /onSignOut=\{requestSignOut\}/, 'shell delegates to the shared confirmation')
    assert.match(layout, /useSubscriptionGate\(\)/, 'subscription gate preserved')
    assert.match(layout, /<NotificationBell \/>/, 'notification bell preserved')
    assert.match(layout, /checkFeature\(method\.feature\)/, 'FAB feature gating preserved')
    assert.match(layout, /isSubscriptionRoute/, 'subscription route treatment preserved')
  })

  await t.test('nav translations exist in all three locales', () => {
    const keys = ['primaryNav', 'sectionMain', 'sectionAccount', 'collapseNav', 'expandNav', 'openNav', 'closeNav']
    const dicts = ['en', 'hi', 'bn'].map(l => JSON.parse(read(`messages/${l}/nav.json`)))
    for (const dict of dicts) {
      for (const k of keys) assert.ok(String(dict[k] || '').trim().length > 0, `${k} translated`)
    }
    assert.deepEqual(Object.keys(dicts[1]).sort(), Object.keys(dicts[0]).sort(), 'hi keys match en')
    assert.deepEqual(Object.keys(dicts[2]).sort(), Object.keys(dicts[0]).sort(), 'bn keys match en')
  })
})
