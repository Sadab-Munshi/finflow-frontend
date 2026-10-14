---
name: skill-add-translation
description: Checklist — add a user-facing string in English, Hindi, Bengali
last_updated: 2026-10-06
audience: [agent]
related: [conventions, state]
---

# Skill: Add a Translation

## Inputs
- The English copy (short, action-oriented)
- Where it renders (which page/component)

## Steps
1. Open `context/LanguageContext.tsx` — translations live inline in three maps:
   `en:` (`:8`), `hi:` (`:56`), `bn:` (`:104`), each ~48 keys.
2. Choose a camelCase key that names the **thing, not the sentence**
   (`createBudget`, `budgetAmount`, `noTransactions`) — check neighbors for style.
3. Add the key to **all three** maps in the same edit. If you can't translate
   yourself, use the English string in hi/bn as a placeholder **and** flag it in
   the PR description — the fallback at `:179` would otherwise render the raw
   key to users.
4. Consume: in client components `const { t } = useLanguage()`
   (`:166`) then `t('yourKey')`.
5. Dynamic values: the map stores plain strings — concatenate in JSX
   (`{t('spent')}: ₹{amount}`); there is no interpolation system.
6. Keep keys flat; don't namespace with dots (no nesting support).
7. JSX-in-string is impossible — split copy around markup
   (`{t('termsPrefix')} <Link …>{t('termsLink')}</Link>`).

## Verify
- Switch language in `/settings` → the new string renders in en/hi/bn.
- No raw camelCase keys visible anywhere on screen (that's the missing-key
  fallback at `context/LanguageContext.tsx:179` leaking).
- Long Hindi/Bengali strings don't break 360 px layouts (check the container
  wraps; hi/bn run longer than en).

## Common mistakes
- Adding `en` only → hi/bn users see the key itself.
- Putting punctuation/emoji differences per language inconsistently — tone is
  warm + plain; match neighbors.
- Deriving keys from sentence text (`spentMoneyOnFood`) — reuse existing keys
  instead of near-duplicates (`spent`, `amount`, `date`).
- Forgetting that `t()` is client-context — server components cannot use
  `useLanguage`; keep server-rendered pages' copy minimal or move text into a
  client child.
