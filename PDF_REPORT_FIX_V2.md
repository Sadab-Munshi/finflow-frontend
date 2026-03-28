# FinFlow PDF Report — Full Fix Instructions

## Overview
Fix and improve the existing PDF report generation.
Apply all sections below in order.

---

## FIX 1 — HEADER

Make header bar thinner: reduce height by 30%.
Current header is too tall and heavy.

**First page only:** show `public/images/report-logo.png` on left side
wrapped in `#D9FAF7` rounded container.
Height: 36px, maintain aspect ratio.
add logo link images/report-logo.png.
**Page 2 onwards:** no logo, just slim text header.

Header layout:
- Left: logo (page 1 only)
- Center: Month Year bold white + "Financial Report" smaller white
- Right: User full name bold white + Generated date smaller white

---

## FIX 2 — AI SUMMARY FORMAT

Update the AI prompt to generate a structured summary
with these 4 sections clearly separated:

**Section A — Overall Assessment**
2-3 sentences on general financial health for the month.

**Section B — Spending Analysis**
2-3 sentences on which categories consumed most budget.
Compare to healthy spending patterns.

**Section C — Income Analysis**
1-2 sentences on income sources and stability.

**Section D — Key Recommendations**
Exactly 3 numbered actionable recommendations.
Each must be specific, not generic.

### PDF Formatting:
- Each section label in bold dark text
- Key financial terms: bold + teal (#0D9488)
- Recommendations as numbered list 1. 2. 3.
- Line height: 1.6 for readability
- Slight indent on recommendation points

---

## FIX 3 — STAT BOXES COLORS

Each box must have distinct background and border.

### Box 1 — Total Income
- Background: `#ECFDF5`
- Border: `1px solid #6EE7B7`
- Label: `#065F46`
- Value: `#047857` green bold large

### Box 2 — Total Expense
- Background: `#FFF1F2`
- Border: `1px solid #FECDD3`
- Label: `#9F1239`
- Value: `#E11D48` red bold large

### Box 3 — Net Savings
**If NEGATIVE:**
- Background: `#FFF1F2`
- Border: `1px solid #FECDD3`
- Badge: "CONCERNING DEFICIT" red pill at top
- Value: `#E11D48` red bold large
- Savings Rate: small gray text below

**If POSITIVE:**
- Background: `#ECFDF5`
- Border: `1px solid #6EE7B7`
- Badge: "HEALTHY SAVINGS" green pill at top
- Value: `#047857` green bold large
- Savings Rate: small gray text below

**Do NOT add a duplicate full-width net savings banner.**

---

## FIX 4 — EXPENSE BREAKDOWN COLORS

Each category bar must use a unique color.

| Category | Bar Color |
|---|---|
| Transport | `#F97316` orange |
| Health | `#0D9488` teal |
| Food & Dining | `#EF4444` red |
| Shopping | `#8B5CF6` purple |
| Bills & Utilities | `#3B82F6` blue |
| Education | `#F59E0B` amber |
| Entertainment | `#EC4899` pink |
| Groceries | `#10B981` emerald |
| Personal Care | `#6366F1` indigo |
| Other | `#6B7280` gray |

- Bar background: same color at 15% opacity
- Percentage text: same color as bar
- Amount: dark gray, right-aligned below bar
- Rows separated by light gray dividers

---

## FIX 5 — ADD INCOME BREAKDOWN SECTION

Add this as a NEW section after AI Summary
and BEFORE Expense Breakdown.

**Title:** "1. INCOME BREAKDOWN BY SOURCE"
- Bold dark text
- Teal left border accent (4px solid #0D9488)

**Each income row:**
- Source name on left
- Horizontal progress bar (teal shades)
- Percentage on right end of bar
- Rs. Amount right-aligned below bar

**If no income recorded:**
Show gray italic text:
"No income recorded for this month"

**Renumber remaining sections:**
- Income Breakdown = Section 1
- Expense Breakdown = Section 2
- Transaction Details = Section 3

---

## FIX 6 — TRANSACTION TABLE

**Single header row only** — never repeat headers.

Header row style:
- Background: `#0D9488` teal
- Text: white bold
- Columns: Date | Description | Category | Type | Amount

**Data rows:**
- Odd rows: white background
- Even rows: `#F9FAFB` light gray
- Light gray bottom border each row

**Column rules:**
- Date: DD/MM/YYYY format
- Description: show note, if empty or "Done" → show category name
- Type: colored badge pill
  - expense = `#FFF1F2` bg + `#E11D48` red text
  - income = `#ECFDF5` bg + `#047857` green text
- Amount:
  - expense = `#E11D48` red
  - income = `#047857` green

**Page 2 table:**
Add column headers again at top of page 2.
Same teal header style.
Continue alternating row colors from page 1.

---

## FIX 7 — PAGE 2 HEADER

Slim header for all pages after page 1:
- Thin teal top border line
- Left: "FinFlow · {Month Year}" small gray
- Right: "Page {n}" small gray
- No logo on page 2+

---

## GLOBAL RULES

### Currency
Use `Rs.` consistently everywhere until
₹ font rendering is confirmed working.
Never mix Rs. and ₹ in same document.

### Logo
- File: `/images/report-logo.png`
- First page header only
- Wrap in `#D9FAF7` rounded-lg container
- Height: 36px, maintain aspect ratio

### User Name
Fetch from Supabase in this order:
1. `settings.name`
2. `user.user_metadata.full_name`
3. Full email as last fallback
Never split email to extract name.

### Footer (every page)
```
FinFlow Financial Report · Confidential · Generated on {date}, {time} · Page {n}
```
- Centered, small gray text
- Light gray top border above footer

### Section Spacing
- Between sections: 24px
- Inside cards/boxes: 16px padding
- Section titles: teal left border 4px solid #0D9488

---

## WHAT TO REMOVE
- Full-width duplicate net savings red banner
- Emoji/icon characters that render as broken symbols
- Repeated transaction table headers per row
- Redundant "Category Details" table

## WHAT TO KEEP
- AI Summary paragraph (improve format, keep content)
- 3-box metrics layout
- Category progress bar structure
- Confidential footer
- Page 2 overflow for long transaction lists
