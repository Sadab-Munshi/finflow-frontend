import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const CSS = 'app/globals.css'
const LAYOUT = 'components/layout/Layout.tsx'
const DRAWER = 'components/layout/sidebar/MobileNavDrawer.tsx'
const PANEL = 'components/layout/sidebar/PremiumSidebar.tsx'
const ACCOUNT = 'components/layout/sidebar/AccountMenu.tsx'
const AVATAR = 'components/layout/sidebar/AvatarCircle.tsx'
const SIGN_OUT = 'components/auth/SignOutDialog.tsx'

/** Every .ts/.tsx file under a source root, for whole-repo invariants. */
function sourceFiles(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(entry => {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) return sourceFiles(rel)
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : []
  })
}

test('Sign out — one confirmation, one implementation', async t => {
  const dialog = read(SIGN_OUT)

  await t.test('the shared dialog carries the exact required copy', () => {
    const en = JSON.parse(read('messages/en/nav.json'))
    assert.equal(en.signOutConfirmTitle, 'Sign out of FinFlow?')
    assert.equal(en.signOutConfirmBody, 'Are you sure you want to sign out of your account?')
    assert.equal(en.signOutConfirm, 'Sign Out')
    assert.equal(en.signOutConfirmCancel, 'Cancel')
    assert.match(dialog, /t\('signOutConfirmTitle'\)/, 'title bound to the key')
    assert.match(dialog, /t\('signOutConfirmBody'\)/, 'body bound to the key')
    assert.match(dialog, /t\('signOutConfirm'\)/, 'confirm label bound to the key')
    assert.match(dialog, /t\('signOutConfirmCancel'\)/, 'cancel label bound to the key')
  })

  await t.test('built on the existing dialog component, never window.confirm', () => {
    assert.match(dialog, /from '@\/components\/ui\/alert-dialog'/, 'reuses the shipped AlertDialog')
    for (const file of [...sourceFiles('app'), ...sourceFiles('components'), ...sourceFiles('context'), ...sourceFiles('lib')]) {
      const src = read(file)
      assert.ok(!/window\.confirm\(|(?<![.\w])confirm\(/.test(src), `${file} must not use native confirm()`)
    }
    assert.ok(!/window\.confirm\(/.test(dialog), 'no native confirm in the dialog itself')
  })

  await t.test('auth state only changes after confirmation', () => {
    // The single user-initiated sign-out call in the app.
    const callers = [...sourceFiles('app'), ...sourceFiles('components')].filter(f => /\bauth\.signOut\(/.test(read(f)))
    assert.deepEqual(callers, [SIGN_OUT], 'only the shared dialog signs the user out')
    // One forced sign-out remains for banned accounts. It used to be two: the
    // mount-time `user_management` read and the 20s ban poll each signed out
    // independently. Both were consolidated into a single bootstrap-driven path
    // (Phase 3: duplicate ban-check loops), so the invariant is now exactly one
    // forced sign-out in the provider and no user-initiated ones outside the
    // shared dialog.
    const context = read('context/UserContext.tsx')
    assert.equal((context.match(/auth\.signOut\(/g) || []).length, 1, 'one forced sign-out for banned accounts')
    assert.match(context, /scope: 'local'/, 'forced sign-out stays local-scoped')
  })

  await t.test('duplicate requests and in-flight state are handled', () => {
    assert.match(dialog, /const inFlight = useRef\(false\)/, 'tick-level guard against double taps')
    assert.match(dialog, /if \(inFlight\.current\) return/, 'guard short-circuits the second click')
    assert.match(dialog, /event\.preventDefault\(\)/, 'Radix Action does not close the dialog mid-request')
    assert.match(dialog, /if \(pending\) return/, 'dialog cannot be dismissed while signing out')
    assert.match(dialog, /role="alert"/, 'failure is announced')
    assert.match(dialog, /aria-busy=\{pending\}/, 'pending state exposed to assistive tech')
    assert.match(dialog, /disabled=\{pending\}/, 'both actions disable while pending')
  })

  await t.test('every entry point routes through it', () => {
    assert.match(read(LAYOUT), /const \{ requestSignOut, signOutDialog \} = useSignOutConfirm\(\)/, 'shell owns one dialog')
    assert.match(read(LAYOUT), /onSignOut=\{requestSignOut\}/, 'sidebar triggers the dialog, not the request')
    assert.match(read(LAYOUT), /\{signOutDialog\}/, 'dialog rendered by the shell')
    assert.match(read('app/dashboard/SignOutButton.tsx'), /useSignOutConfirm\(\)/, 'dashboard button uses the flow')
    assert.match(read('app/profile/page.tsx'), /<SignOutDialog open=\{showSignOutDialog\}/, 'profile screen reuses the dialog')
  })

  await t.test('opening the account menu cannot sign out', () => {
    const account = read(ACCOUNT)
    const menuOpen = account.slice(account.indexOf('aria-haspopup'), account.indexOf('</button>'))
    assert.ok(!/onSignOut|signOut\(/.test(menuOpen), 'the trigger only toggles visibility')
  })
})

test('Avatar — PRO ring comes from real entitlement', async t => {
  const avatar = read(AVATAR)
  const account = read(ACCOUNT)
  const layout = read(LAYOUT)

  await t.test('gold ring with a gap, never cropping the photo', () => {
    assert.match(avatar, /PRO_RING_COLOR = '#C9A45C'/, 'champagne gold token')
    assert.match(avatar, /outline: `1\.5px solid \$\{PRO_RING_COLOR\}`/, 'ring paints outside the crop')
    assert.match(avatar, /outlineOffset: '2px'/, '2px gap between photo and ring')
    assert.ok(!/border:\s*[^;]*C9A45C/.test(avatar), 'never a border — a border would eat into the 32px photo')
    assert.match(avatar, /'0 0 0 1px rgba\(229, 235, 233, 1\)'/, 'free users get the neutral hairline instead')
  })

  await t.test('circular crop contract untouched', () => {
    assert.match(avatar, /position: 'relative'/, 'still positioned')
    assert.match(avatar, /overflow: 'hidden'/, 'still clipped')
    assert.match(avatar, /objectFit: 'cover'/, 'still covered')
  })

  await t.test('PRO is never hardcoded', () => {
    assert.ok(!/isPro=\{true\}|isPro:\s*true\b|isPro = true/.test(avatar + account), 'no hardcoded entitlement')
    assert.match(layout, /const isPro = Boolean\(user\?\.isPro\) \|\| userTier === 'pro' \|\| userTier === 'max'/, 'derived from the session')
    assert.match(account, /\{isPro && <span className="ff-pro-chip">/, 'badge is conditional')
    assert.match(account, /isPro=\{isPro\}/, 'panel, rail and drawer all pass the live value')
    assert.match(read(CSS), /\.ff-pro-chip \{/, 'badge has a restrained style')
    assert.ok(!/<Crown/.test(avatar + account + layout), 'no oversized crown badge')
  })
})

test('Mobile drawer — simplified, pinned and orientation safe', async t => {
  const drawer = read(DRAWER)
  const css = read(CSS)

  await t.test('account actions removed from the drawer only', () => {
    assert.ok(!drawer.includes('onSignOut'), 'drawer no longer signs out')
    assert.ok(!drawer.includes('ff-cta'), 'Add button removed from the drawer')
    assert.ok(!drawer.includes('href="/add'), 'no second entry to /add in the overlay')
    assert.match(read(PANEL), /href="\/add\?tab=manual"/, 'desktop keeps its Add button')
    const account = read(ACCOUNT)
    // The inline block ends where `const menuItems` begins — the popup's own
    // items (which do include Edit Profile / Sign Out) are shared by the
    // expanded panel and the portalled rail menu, and are not the drawer's.
    const inline = account.slice(account.indexOf("variant === 'inline'"), account.indexOf('const menuItems'))
    assert.ok(!inline.includes('ff-inline-actions'), 'no action list in the inline block')
    assert.ok(!inline.includes('editProfile'), 'no Edit Profile row')
    assert.ok(!inline.includes('signOut'), 'no Sign Out row')
    assert.ok(inline.includes('<AvatarCircle'), 'identity still shown')
  })

  await t.test('one shared panel-toggle glyph and an accessible label', () => {
    assert.match(drawer, /import \{ PanelLeftClose \}/, 'same icon component as the desktop toggle')
    assert.match(read('components/layout/sidebar/BrandHeader.tsx'), /<PanelLeftClose size=\{17\} strokeWidth=\{1\.9\}/, 'identical glyph spec')
    assert.match(drawer, /<PanelLeftClose size=\{17\} strokeWidth=\{1\.9\} aria-hidden="true" \/>/, 'drawer reuses it verbatim')
    assert.match(drawer, /aria-label=\{t\('closeNav'\)\}/, 'labelled via the existing key')
    assert.equal(JSON.parse(read('messages/en/nav.json')).closeNav, 'Close navigation')
    assert.ok(!drawer.includes('X size'), 'the X icon is gone')
  })

  await t.test('brand, nav and account are three independent regions', () => {
    const sheet = css.slice(css.indexOf('.ff-drawer {'), css.indexOf('.ff-drawer-head {'))
    assert.match(sheet, /overflow: hidden/, 'the sheet itself never scrolls')
    assert.match(sheet, /height: 100dvh/, 'tracks the dynamic viewport')
    const nav = css.slice(css.indexOf('.ff-drawer .ff-nav {'), css.indexOf('.ff-drawer .ff-nav-row'))
    assert.match(nav, /flex: 1 1 auto/, 'nav absorbs the free space')
    assert.match(nav, /overflow-y: auto/, 'nav is the only scroller')
    assert.match(nav, /overscroll-behavior: contain/, 'scroll never chains to the page')
    assert.match(css, /\.ff-drawer \.ff-foot \{ flex: 0 0 auto; \}/, 'account block pinned')
    assert.match(css, /\n\.ff-drawer-head \{[\s\S]{0,200}flex: 0 0 auto/, 'brand row pinned')
    assert.match(css, /\.ff-drawer \.ff-nav > \.ff-section-label:first-child \{ margin-top: 4px; \}/, 'gap rebalanced after the Add button left')
  })

  await t.test('the desktop panel is glued to the visible viewport, not the ICB', () => {
    const panel = css.slice(css.indexOf('.ff-sidebar {'), css.indexOf('/* ── Brand header'))
    // The dvh box now belongs to the shell, which the panel fills as a flex
    // child; either way the panel cannot drift from the visible viewport.
    assert.match(css, /\.ff-shell \{[\s\S]{0,300}height: 100dvh/, 'shell tracks the dynamic viewport')
    assert.match(panel, /height: 100%/, 'panel fills the shell')
    assert.ok(!/position: fixed/.test(panel), 'panel is not a fixed overlay any more')
    assert.ok(!/bottom: 0/.test(panel), 'no stale bottom-anchored ICB sizing')
    assert.match(panel, /transform: translateZ\(0\)/, 'own compositor layer: no scroll repaint lag')
    assert.match(panel, /transition: width var\(--ff-dur\)/, 'width transition preserved')
  })

  await t.test('page-level bounce contained inside the shell only', () => {
    assert.match(css, /html:has\(\.ff-shell\),\s*body:has\(\.ff-shell\) \{[\s\S]{0,120}overscroll-behavior: none/, 'scoped root containment')
    assert.match(css, /\.ff-canvas \{[\s\S]{0,400}overscroll-behavior: contain/, 'and containment on the scroll canvas')
    assert.match(read(LAYOUT), /'ff-shell',/, 'shell carries the hook class')
    assert.ok(!/^body \{[^}]*overflow: hidden/m.test(css), 'global scrolling never disabled')
  })

  await t.test('orientation changes cannot leave stale state', () => {
    const layout = read(LAYOUT)
    assert.match(layout, /if \(window\.innerWidth === lastWidth\) return/, 'address-bar resizes are ignored')
    assert.match(layout, /setFabOpen\(false\)/, 'speed dial closes on rotation')
    assert.match(layout, /if \(window\.innerWidth >= 900\) setDrawerOpen\(false\)/, 'drawer closes when the rail returns')
    assert.match(read('components/layout/sidebar/useSidebarRail.ts'), /SIDEBAR_STORAGE_KEY/, 'collapse preference stays a separate concern')
  })

  await t.test('FAB and notification bell do not collide in landscape', () => {
    const layout = read(LAYOUT)
    assert.match(layout, /fixed bottom-20 right-5 z-\[55\] no-print min-\[900px\]:hidden/, 'FAB is phone-only, above the drawer backdrop')
    assert.match(layout, /max-h-\[calc\(100dvh-9\.5rem\)\][^"]*overflow-y-auto/, 'dial capped to the visible height')
    assert.match(css, /@media \(max-height: 480px\) \{\s*\.ff-fab-menu \{\s*display: grid;/, 'short landscape folds the dial into two columns')
    assert.match(css, /\.ff-fab-menu > button \{ flex: 0 0 auto; \}/, 'dial rows never shrink below 44px')
    assert.ok(!/top-4 right-4 z-\[51\]/.test(layout), 'old hard-coded bell offsets gone')
    assert.match(css, /\.ff-topbar \{[\s\S]{0,240}env\(safe-area-inset-top\)/, 'header respects the notch')
    assert.match(read('components/notifications/NotificationBell.tsx'), /className="ff-icon-btn relative"/, '44px touch target via the shared control')
    assert.match(read('components/notifications/NotificationCenter.tsx'), /ff-notif-panel/, 'dropdown capped on short viewports')
    assert.match(css, /\.ff-notif-panel \{[\s\S]{0,160}max-height: calc\(100dvh - 5rem\)/, 'dropdown scrolls inside itself')
  })
})

test('Phase C — preserved design and behaviour', async t => {
  const css = read(CSS)
  const panel = read(PANEL)

  await t.test('the approved light system is untouched', () => {
    for (const token of [
      '--ff-bg: #f8faf9',
      '--ff-text: #172b2a',
      '--ff-muted: #5f736f',
      '--ff-active-bg: #e5f2ee',
      '--ff-active-fg: #077569',
      '--ff-primary: #087f72',
      '--ff-sidebar-expanded: 248px',
      '--ff-sidebar-rail: 68px',
      '--ff-dur: 240ms',
    ]) {
      assert.ok(css.includes(token), `${token} preserved`)
    }
    assert.equal((panel.match(/<PremiumSidebar/g) || []).length, 0, 'no self-nesting')
    assert.match(panel, /<BrandHeader toggle=\{toggle\} \/>/, 'brand header untouched')
  })

  await t.test('desktop nav scrolling is still independent', () => {
    const nav = css.slice(css.indexOf('.ff-nav {'), css.indexOf('.ff-nav::-webkit-scrollbar'))
    assert.match(nav, /overflow-y: auto/, 'nav scrolls on its own')
    assert.match(nav, /min-height: 0/, 'flex child may shrink below content')
  })
})
