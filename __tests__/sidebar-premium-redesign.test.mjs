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
const DRAWER = 'components/layout/sidebar/MobileNavDrawer.tsx'
const LAYOUT = 'components/layout/Layout.tsx'
const CSS = 'app/globals.css'
const ROOT_LAYOUT = 'app/layout.tsx'

test('Premium sidebar — shared navigation model and real routes', async t => {
  const nav = read(NAV)

  await t.test('every real destination is wired, with no invented links', () => {
    for (const href of [
      '/dashboard',
      '/history',
      '/budgets',
      '/insights',
      '/analytics',
      '/reports',
      '/subscription',
      '/settings',
    ]) {
      assert.ok(nav.includes(`path: '${href}'`), `${href} is a real destination`)
    }
    assert.ok(!nav.includes("'#'"), 'no placeholder # links')
    assert.ok(!nav.includes('/accounts'), 'no invented /accounts route')
    assert.ok(!nav.includes('/transactions'), 'no invented /transactions route')
  })

  await t.test('all layouts render from one source of truth', () => {
    assert.match(read(PANEL), /SIDEBAR_PRIMARY_NAV/, 'desktop panel uses the shared list')
    assert.match(read(DRAWER), /SIDEBAR_PRIMARY_NAV/, 'mobile drawer uses the same list')
    assert.match(read(LIST), /isNavActive/, 'active state is derived from the route helper')
  })

  await t.test('active detection covers nested routes and child pages', () => {
    assert.match(nav, /pathname\.startsWith\(`\$\{path\}\/`\)/, 'nested paths light up their parent')
    assert.match(nav, /'\/history': \['\/transaction'\]/, '/transaction/[id] belongs to History')
    assert.match(nav, /'\/settings': \['\/privacy-security', '\/backup-restore'\]/, 'settings sub-pages belong to Settings')
    assert.match(nav, /export function isNavActive/, 'helper is exported for tests and reuse')
  })
})

test('Premium sidebar — geometry, states and motion tokens', async t => {
  const css = read(CSS)

  await t.test('widths match the spec (272px expanded / 72px rail)', () => {
    assert.match(css, /--ff-sidebar-expanded: 272px/, 'expanded width is 272px')
    assert.match(css, /--ff-sidebar-rail: 72px/, 'rail width is 72px')
    assert.match(css, /html\[data-ff-sidebar="collapsed"\]/, 'rail width is driven by the html attribute')
  })

  await t.test('brand palette and motion curve are pinned', () => {
    assert.match(css, /--ff-surface: #082f2d/, 'deep teal base surface')
    assert.match(css, /--ff-surface-hi: #0b3c38/, 'subtle tonal gradient endpoint')
    assert.match(css, /--ff-mint: #72e2bf/, 'mint accent')
    assert.match(css, /--ff-dur: 260ms/, 'width animation sits in 220-280ms')
    assert.match(css, /--ff-ease: cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/, 'polished ease-out curve')
    assert.ok(!/\btransition:\s*all\b/.test(css), 'never transitions every property')
  })

  await t.test('shell offset follows the sidebar width', () => {
    assert.match(css, /\.ff-main\s*\{[^}]*padding-left: var\(--ff-sidebar-w\)/, 'main content is offset by the live width')
    assert.match(css, /\.ff-main[\s\S]{0,160}transition: padding-left var\(--ff-dur\)/, 'offset animates in sync')
  })

  await t.test('labels fade and translate instead of snapping', () => {
    assert.match(css, /\.ff-nav-label[\s\S]{0,200}transition: opacity 140ms/, 'label fades over ~140ms')
    assert.match(css, /translateX\(-4px\)/, 'labels translate 4px during the switch')
  })

  await t.test('active, hover, focus and disabled treatments exist', () => {
    assert.match(css, /\.ff-nav-row--active/, 'persistent active pill')
    assert.match(css, /\.ff-nav-row--active \.ff-nav-bar/, 'slim mint left indicator on the active row')
    assert.match(css, /\.ff-nav-row:hover \{ background: rgba\(255, 255, 255, 0\.06\)/, 'subtle hover brightening')
    assert.match(css, /\.ff-nav-row:focus-visible \{ outline: 2px solid var\(--ff-mint\); outline-offset: 2px; \}/, 'visible 2px offset focus ring')
    assert.ok(!css.includes('outline: none'), 'focus outlines are never suppressed')
  })

  await t.test('reduced motion collapses every transition', () => {
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)', css.indexOf('.ff-sidebar')))
    assert.match(block, /\.ff-sidebar,[\s\S]*transition-duration: 1ms !important/, 'sidebar transitions become immediate')
    assert.match(block, /\.ff-drawer,[\s\S]*animation-duration: 1ms !important/, 'drawer animations become immediate')
  })
})

test('Premium sidebar — expansion / collapse behaviour', async t => {
  const rail = read(RAIL)
  const brand = read(BRAND)
  const rootLayout = read(ROOT_LAYOUT)

  await t.test('preference is remembered with SSR-safe guards', () => {
    assert.match(rail, /SIDEBAR_STORAGE_KEY = 'finflow:sidebar'/, 'preference key is namespaced')
    assert.match(rail, /try \{[\s\S]*localStorage\.getItem[\s\S]*\} catch/, 'storage reads are guarded')
    assert.match(rail, /catch \{[\s\S]*private mode/, 'storage writes are guarded')
  })

  await t.test('breakpoints: 1200px default expanded, 900px compact rail', () => {
    assert.match(rail, /SIDEBAR_WIDE_BREAKPOINT = 1200/, 'wide desktop threshold')
    assert.match(rail, /SIDEBAR_DESKTOP_BREAKPOINT = 900/, 'rail/drawer threshold')
    assert.match(rail, /window\.innerWidth >= SIDEBAR_WIDE_BREAKPOINT[\s\S]{0,80}\? readPreference\(\)/, 'wide screens restore the stored choice')
    assert.match(rail, /compactExpandedRef\.current\s*\? 'expanded'\s*:\s*'collapsed'/, 'compact screens default to the rail')
  })

  await t.test('the first paint is correct (pre-hydration bootstrap)', () => {
    assert.match(rootLayout, /finflow:sidebar/, 'bootstrap reads the same key')
    assert.match(rootLayout, /setAttribute\('data-ff-sidebar', state\)/, 'bootstrap writes the html attribute')
    assert.ok(
      rootLayout.indexOf("data-ff-sidebar") < rootLayout.indexOf('<body'),
      'bootstrap runs in <head>, before the body paints'
    )
  })

  await t.test('toggle is discoverable, labelled and focus-preserving', () => {
    assert.match(brand, /aria-label=\{t\('collapseNav'\)\}/, 'expanded label = Collapse navigation')
    assert.match(brand, /aria-label=\{t\('expandNav'\)\}/, 'rail label = Expand navigation')
    assert.match(brand, /aria-controls="ff-sidebar-nav"/, 'toggle points at the nav landmark')
    assert.match(brand, /aria-expanded/, 'expanded state is exposed')
    assert.match(brand, /target\?\.focus\(\{ preventScroll: true \}\)/, 'focus follows the toggle across states')
    assert.match(read('app/globals.css'), /\.ff-toggle \{[\s\S]{0,120}width: 44px;[\s\S]{0,80}height: 44px;/, '44x44 clickable target')
  })
})

test('Premium sidebar — accessibility and semantics', async t => {
  const panel = read(PANEL)
  const drawer = read(DRAWER)
  const list = read(LIST)
  const account = read(ACCOUNT)

  await t.test('landmarks and labels', () => {
    assert.match(panel, /<nav id="ff-sidebar-nav"[\s\S]{0,120}aria-label=\{t\('primaryNav'\)\}/, 'desktop nav landmark is labelled')
    assert.match(drawer, /<nav id="ff-drawer-nav"[\s\S]{0,120}aria-label=\{t\('primaryNav'\)\}/, 'drawer nav landmark is labelled')
    assert.match(drawer, /Dialog\.Title className="sr-only"/, 'drawer has an accessible title')
  })

  await t.test('real links, real buttons, aria-current', () => {
    assert.match(list, /<Link\b/, 'rows are framework links, not divs')
    assert.match(list, /aria-current=\{active \? 'page' : undefined\}/, 'active row exposes aria-current="page"')
    assert.match(account, /<button\b[\s\S]{0,200}aria-haspopup="true"/, 'profile menu button is a real button with a popup role')
    assert.match(account, /role="menu"/, 'popup is exposed as a menu')
    assert.match(account, /role="menuitem"/, 'menu entries carry menuitem roles')
  })

  await t.test('icon-only rail keeps accessible names and tooltips', () => {
    assert.match(list, /tooltips \? \(/, 'rail rows get tooltips')
    assert.match(list, /className="ff-tooltip"/, 'tooltip content is labelled')
    assert.match(panel, /tooltips=\{collapsed\}/, 'tooltips only exist while collapsed')
    assert.match(panel, /<Tooltip\.Provider delayDuration=\{180\}/, 'tooltips use the project tooltip primitive')
    assert.match(read('app/globals.css'), /\.ff-tooltip[\s\S]{0,400}z-index: 70/, 'tooltips are portalled above the nav scroll container')
  })

  await t.test('drawer focus management and scroll lock', () => {
    assert.match(drawer, /Dialog\.Root open=\{open\} onOpenChange=\{onOpenChange\}/, 'dialog owns open state')
    assert.match(drawer, /Dialog\.Overlay className="ff-drawer-overlay/, 'backdrop is a real overlay (click to close)')
    assert.match(drawer, /Dialog\.Close asChild/, 'dedicated close button')
    assert.match(drawer, /onCloseAutoFocus=\{event => \{[\s\S]{0,600}trigger\.focus\(\{ preventScroll: true \}\)/, 'focus returns to the menu trigger')
    assert.match(read(LAYOUT), /if \(window\.innerWidth >= 900\) setDrawerOpen\(false\)/, 'resizing to desktop clears the drawer and its scroll lock')
  })
})

test('Premium sidebar — responsive integration', async t => {
  const layout = read(LAYOUT)
  const css = read(CSS)

  await t.test('mobile shows the trigger, desktop hides it', () => {
    assert.match(layout, /className="ff-menu-trigger no-print"/, 'trigger is wired into the shell')
    assert.match(layout, /aria-label=\{t\('openNav'\)\}/, 'trigger has an accessible name')
    assert.match(css, /@media \(min-width: 900px\) \{\s*\.ff-menu-trigger \{ display: none; \}/, 'trigger disappears once the rail fits')
    assert.match(css, /\.ff-menu-trigger \{[\s\S]{0,200}width: 44px;[\s\S]{0,60}height: 44px;/, 'touch target is 44x44')
  })

  await t.test('bottom nav and FAB follow the same 900px breakpoint', () => {
    assert.match(layout, /min-\[900px\]:hidden fixed bottom-0/, 'bottom nav hides at the rail breakpoint')
    assert.ok(!layout.includes('md:ml-64'), 'old md:ml-64 shell offset is gone')
    assert.ok(!layout.includes('md:hidden flex-col'), 'old second sidebar is gone')
    assert.ok(!layout.includes('w-64 bg-gradient-to-b from-teal-700'), 'old teal sidebar removed')
  })

  await t.test('drawer width, safe areas and short viewports', () => {
    assert.match(css, /width: min\(288px, calc\(100vw - 48px\)\)/, 'phone drawer width is capped so the backdrop stays visible')
    assert.match(css, /padding: env\(safe-area-inset-top\) 14px calc\(14px \+ env\(safe-area-inset-bottom\)\)/, 'safe-area insets respected')
    assert.match(css, /height: 100dvh/, 'mobile browser chrome is accounted for')
    assert.match(css, /@media \(min-width: 900px\) and \(max-height: 640px\)/, 'compact desktop / short viewport tuning')
    assert.match(css, /overscroll-behavior: contain/, 'nav scroll does not chain to the page')
  })

  await t.test('one shared nav data set drives every layout', () => {
    assert.equal((layout.match(/<PremiumSidebar/g) || []).length, 1, 'single desktop sidebar instance')
    assert.equal((layout.match(/<MobileNavDrawer/g) || []).length, 1, 'single mobile drawer instance')
  })
})

test('Premium sidebar — preserved app behaviour', async t => {
  const layout = read(LAYOUT)

  await t.test('auth, subscription gate and notifications are untouched', () => {
    assert.match(layout, /createClient\(\)[\s\S]{0,120}auth\.signOut\(\{ scope: 'local' \}\)/, 'sign out still uses Supabase local scope')
    assert.match(layout, /useSubscriptionGate\(\)/, 'subscription gating preserved')
    assert.match(layout, /checkFeature\(method\.feature\)/, 'FAB feature gating preserved')
    assert.match(layout, /<NotificationBell \/>/, 'notification bell preserved')
    assert.match(layout, /isSubscriptionRoute/, 'subscription route treatment preserved')
    assert.match(layout, /setDrawerOpen\(false\)[\s\S]{0,60}setFabOpen\(false\)/, 'overlays still close on navigation')
  })

  await t.test('the add flow still points at /add with a real tab', () => {
    assert.match(read(PANEL), /href="\/add\?tab=manual"/, 'desktop CTA opens manual entry')
    assert.match(read(DRAWER), /href="\/add\?tab=manual"/, 'drawer CTA opens manual entry')
  })
})

test('Premium sidebar — i18n parity for new strings', async t => {
  const ns = ['en', 'hi', 'bn'].map(loc => JSON.parse(read(`messages/${loc}/nav.json`)))
  const keys = [
    'primaryNav',
    'sectionMain',
    'sectionAccount',
    'collapseNav',
    'expandNav',
    'openNav',
    'closeNav',
  ]

  await t.test('en, hi and bn all define the new sidebar strings', () => {
    for (const msg of ns) {
      for (const key of keys) {
        assert.ok(typeof msg[key] === 'string' && msg[key].trim().length > 0, `${key} is translated`)
      }
    }
    assert.deepEqual(Object.keys(ns[1]).sort(), Object.keys(ns[0]).sort(), 'Hindi keys match English')
    assert.deepEqual(Object.keys(ns[2]).sort(), Object.keys(ns[0]).sort(), 'Bengali keys match English')
  })

  await t.test('the extracted brand mark exists', () => {
    assert.ok(exists('public/images/finflow-mark.png'), 'logo mark is available for the 40px brand container')
  })
})
