import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const CSS = 'app/globals.css'
const LAYOUT = 'components/layout/Layout.tsx'
const TOPBAR = 'components/layout/AppTopBar.tsx'
const BELL = 'components/notifications/NotificationBell.tsx'

function sourceFiles(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(entry => {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) return sourceFiles(rel)
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : []
  })
}

test('Layout — viewport lock and a single scroll canvas', async t => {
  const css = read(CSS)
  const layout = read(LAYOUT)

  await t.test('the document never scrolls inside the app shell', () => {
    assert.match(css, /html:has\(\.ff-shell\),\s*body:has\(\.ff-shell\) \{\s*height: 100%;\s*overflow: hidden;/, 'root is locked')
    assert.match(css, /\.ff-shell \{[\s\S]{0,260}overflow: hidden/, 'shell clips')
    assert.match(css, /\.ff-shell \{[\s\S]{0,300}height: 100dvh/, 'dynamic viewport height')
  })

  await t.test('root lock is scoped, not global', () => {
    // The marketing/auth pages must keep normal document scrolling.
    assert.ok(!/^html \{[\s\S]{0,80}overflow: hidden/m.test(css), 'no global html overflow lock')
    assert.match(css, /html:has\(\.ff-shell\)/, 'lock is scoped with :has()')
  })

  await t.test('exactly one scroll container, with containment', () => {
    assert.match(css, /\.ff-canvas \{[\s\S]{0,320}overflow-y: auto/, 'canvas scrolls')
    assert.match(css, /\.ff-canvas \{[\s\S]{0,360}overscroll-behavior: contain/, 'momentum cannot chain out')
    assert.equal((layout.match(/ff-canvas/g) || []).length, 1, 'one canvas element')
    assert.equal((layout.match(/<main/g) || []).length, 1, 'one main region')
  })

  await t.test('no scroll listeners or scroll-position JS', () => {
    for (const file of [...sourceFiles('app'), ...sourceFiles('components'), ...sourceFiles('hooks')]) {
      const src = read(file)
      assert.ok(!/addEventListener\(['"]scroll['"]/.test(src), `${file} must not listen to scroll`)
      assert.ok(!/window\.scrollY|window\.pageYOffset/.test(src), `${file} must not read scroll position`)
    }
  })
})

test('Sidebar — flex layout, containment and GPU promotion', async t => {
  const css = read(CSS)
  const panel = css.slice(css.indexOf('.ff-sidebar {'), css.indexOf('/* ── Brand header'))

  await t.test('panel is a flex child, not a fixed overlay', () => {
    assert.ok(!/position: fixed/.test(panel), 'no fixed positioning')
    assert.match(panel, /position: relative/, 'in-flow')
    assert.match(panel, /flex: 0 0 auto/, 'sized by flex, not by insets')
    assert.match(panel, /height: 100%/, 'inherits the shell height')
  })

  await t.test('paint and layout isolation', () => {
    assert.match(panel, /contain: layout/, 'layout containment')
    assert.match(panel, /transform: translateZ\(0\)/, 'own GPU layer')
    assert.match(css, /\.ff-nav \{[\s\S]{0,700}contain: layout paint/, 'scrolling region paints in isolation')
  })

  await t.test('three regions: pinned header, scrolling nav, pinned profile', () => {
    assert.match(css, /\.ff-head \{[\s\S]{0,200}flex: 0 0 auto/, 'header pinned')
    assert.match(css, /\.ff-foot \{[\s\S]{0,200}flex: 0 0 auto/, 'profile pinned by flexbox')
    const nav = css.slice(css.indexOf('.ff-nav {'), css.indexOf('.ff-nav::-webkit-scrollbar'))
    assert.match(nav, /flex: 1 1 auto/, 'nav takes the slack')
    assert.match(nav, /min-height: 0/, 'may shrink below content')
    assert.match(nav, /overflow-y: auto/, 'only this region scrolls')
    assert.ok(!/\.ff-foot[\s\S]{0,120}position: absolute/.test(css), 'profile is not absolutely positioned')
  })

  await t.test('main no longer fakes a fixed-panel offset', () => {
    assert.ok(!/\.ff-main[^{]*\{[^}]*padding-left: var\(--ff-sidebar-w\)/.test(css), 'no padding offset')
    assert.match(css, /\.ff-main \{\s*flex: 1 1 auto;/, 'canvas content takes the leftover width')
  })
})

test('Global utility header', async t => {
  const css = read(CSS)
  const bar = read(TOPBAR)
  const layout = read(LAYOUT)
  const bell = read(BELL)

  await t.test('holds the top-level controls', () => {
    assert.match(bar, /<NotificationBell \/>/, 'notifications')
    assert.match(bar, /type="search"/, 'search')
    assert.match(bar, /href="\/settings"/, 'settings')
    assert.match(bar, /href="\/profile"/, 'profile')
    assert.match(layout, /<AppTopBar/, 'mounted from the shell')
  })

  await t.test('sits in the canvas so page controls are never covered', () => {
    assert.match(css, /\.ff-topbar \{[\s\S]{0,240}position: sticky/, 'sticky inside the canvas')
    // Ordering guarantee: the bar is rendered before <main>, i.e. above it in flow.
    assert.ok(layout.indexOf('<AppTopBar') < layout.indexOf('<main'), 'header precedes page content')
  })

  await t.test('responsive density', () => {
    assert.match(css, /@media \(min-width: 900px\) \{\s*\.ff-menu-trigger \{ display: none; \}/, 'hamburger only on phones')
    assert.match(css, /@media \(min-width: 900px\) \{\s*\.ff-search \{ display: flex; \}/, 'search only on wide screens')
    assert.match(css, /@media \(max-width: 899px\) \{[\s\S]{0,160}\.ff-topbar-settings,[\s\S]{0,80}\.ff-topbar-avatar \{ display: none; \}/, 'wide-screen extras hidden on phones')
  })

  await t.test('search routes to a real filtered view', () => {
    assert.match(bar, /router\.push\(q \? `\/history\?q=/, 'search is wired, not decorative')
    assert.match(read('app/history/page.tsx'), /useState\(searchParams\.get\('q'\)/, 'history reads the query')
  })

  await t.test('bell and hamburger are one control style', () => {
    assert.match(bell, /className="ff-icon-btn relative"/, 'bell shares the control class')
    assert.match(bar, /className="ff-icon-btn ff-menu-trigger"/, 'hamburger shares the control class')
    const btn = css.slice(css.indexOf('.ff-icon-btn {'), css.indexOf('.ff-menu-trigger {'))
    assert.match(btn, /width: 44px/, '44px touch target')
    assert.match(btn, /border-radius: 12px/, 'matching radius')
    assert.match(btn, /background: #ffffff/, 'neutral surface')
  })

  await t.test('bell is de-emphasised, badge is not', () => {
    assert.ok(!/from-teal-600 to-teal-700/.test(layout), 'no primary-filled bell container')
    assert.match(bell, /bg-red-500/, 'unread counter keeps its red')
    assert.match(bell, /ring-2 ring-white/, 'counter legible on the neutral surface')
  })
})

test('Action deduplication', async t => {
  const layout = read(LAYOUT)

  await t.test('FAB is phone-only', () => {
    assert.match(layout, /fixed bottom-20 right-5 z-\[55\] no-print min-\[900px\]:hidden/, 'FAB hidden from 900px up')
    assert.match(layout, /bg-black\/25 z-40 no-print min-\[900px\]:hidden/, 'its backdrop too')
  })

  await t.test('the sidebar keeps the creation action on wide screens', () => {
    const panel = read('components/layout/sidebar/PremiumSidebar.tsx')
    assert.match(panel, /href="\/add\?tab=manual"/, 'Add stays in the panel and the rail')
  })
})
