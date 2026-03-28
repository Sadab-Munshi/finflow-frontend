# FinFlow PDF Report Redesign Instructions

## Overview
Redesign the PDF report to match the reference design exactly.
Find the existing PDF generation code and apply all changes below.

---

## SECTION 1 — HEADER BAR

Full-width teal background bar (#0D9488).

Three columns inside the header:

**Left column:**
- FinFlow report logo from `/images/report-logo.png`
- Wrap logo in a rounded container: background #D9FAF7, rounded corners, padding 8px
- Logo height 36px, maintain aspect ratio

**Center column:**
- Month and year in white bold large text (e.g. "March 2026")
- "Financial Report" in white smaller text below

**Right column:**
- User full name in white bold
- "Generated: {date}, {time} IST" in white smaller text below

**Below full header bar:**
- Small gray italic text right-aligned: "All amounts in Indian Rupees (Rs.)"

---

## SECTION 2 — AI FINANCIAL SUMMARY

**Title:** "AI Financial Summary" in bold dark large text

**Paragraph:** Use the AI-generated summary text as-is.

**Text formatting inside paragraph:**
- Make these words bold AND teal colored (#0D9488) when they appear:
  `concerning`, `major allocation`, `reduce`, `mitigate`, `generate income`
- Make category names and rupee amounts bold black

---

## SECTION 3 — KEY METRICS BOXES

**Section title row:**
- Robot/sparkle icon on left
- "AI FINANCIAL SUMMARY & KEY METRICS" in teal bold caps
- Full-width teal bottom border under title

**Three boxes side by side:**

### Box 1 — Total Income
- Background: #ECFDF5 (light teal)
- Teal border
- Top: up arrow icon + money/coins icon
- Label: "TOTAL INCOME" in gray small caps
- Value: ₹ amount in dark bold large font

### Box 2 — Total Expense
- Background: #FFF1F2 (light red/pink)
- Red/pink border
- Top: down arrow icon + shopping cart icon
- Label: "TOTAL EXPENSE" in gray small caps
- Value: ₹ amount in dark bold large font

### Box 3 — Net Savings
- If savings is NEGATIVE:
  - Background: #FFF1F2 (light red)
  - Show red pill badge at top: "CONCERNING DEFICIT"
- If savings is POSITIVE:
  - Background: #ECFDF5 (light green)
  - Show green pill badge at top: "HEALTHY SAVINGS"
- Piggy bank icon
- Label: "NET SAVINGS" in gray small caps
- Value: ₹ amount bold large, RED if negative, GREEN if positive
- Below value: "Savings Rate: {rate}%" in small gray text

**IMPORTANT:** Do NOT add a duplicate full-width net savings
banner below these boxes. Net savings appears ONLY inside Box 3.

---

## SECTION 4 — EXPENSE BREAKDOWN BY CATEGORY

**Section title:** "2. EXPENSE BREAKDOWN BY CATEGORY"
- Bold dark text
- Teal left border accent (4px solid #0D9488)
- Numbered section

**For each category row:**

```
[icon] Category Name    [████████████░░░░░] 98.9%
                                        ₹2,00,000
```

- Category icon in a small colored rounded square on the left
- Category name in medium dark text
- Horizontal progress bar:
  - Width proportional to percentage of total expense
  - Bar color: teal (#0D9488) for large amounts
  - Background: light gray for unfilled portion
- Percentage shown at right end of bar
- ₹ Amount right-aligned below the bar
- Rows separated by light gray dividers

---

## SECTION 5 — TRANSACTION DETAILS

**Section title:** "3. TRANSACTION DETAILS"
- Bold dark text
- Teal left border accent (4px solid #0D9488)
- Numbered section

**Table header row — SINGLE ROW ONLY, not repeated:**
- Background: teal (#0D9488)
- Text: white bold
- Columns: Date | Description | Category | Type | Amount

**Table data rows:**
- Alternating row backgrounds:
  - Odd rows: white
  - Even rows: #F9FAFB (light gray)
- Each row has a light gray bottom border

**Column details:**
- Date: formatted as DD/MM/YYYY
- Description: show transaction note/description.
  If note is empty or "Done", show category name instead
- Category: small icon + category name
- Type: colored badge pill
  - "expense" = red background, red text
  - "income" = green background, green text
- Amount: ₹ value
  - expense = red colored text
  - income = green colored text

---

## SECTION 6 — FOOTER

Centered at bottom of page:
```
FinFlow Financial Report · Confidential · Generated on {date}, {time} · Page 1
```
- Small font, gray color
- Light gray top border line above footer

---

## GLOBAL RULES

### Currency Symbol
- Replace every single instance of "Rs." with "₹"
- This applies to: summary text, stat boxes, tables,
  breakdown section, footer — everywhere without exception

### Logo
- Always use `/images/finflow-logo.png`
- Always wrap in #D9FAF7 background rounded container
- Never use a placeholder icon

### Empty Descriptions
- If transaction note is empty, null, or "Done"
- Display the category name as the description instead
- Logic: `description = transaction.note || transaction.category`

### Net Savings Color Logic
- Positive value → green text + green themed box
- Negative value → red text + red themed box + "CONCERNING DEFICIT" badge
- Zero → gray text + neutral box

### Page Layout
- A4 size portrait orientation
- Margins: 40px all sides
- Font: clean sans-serif (Inter or system font)
- Sections separated by 24px spacing
- All section titles use teal left border accent

---

## WHAT TO REMOVE
- Full-width red Net Savings banner (duplicate of Box 3)
- Repeated table headers for every transaction row
- "Income Breakdown" separate section (redundant with stat boxes)
- "Category Details" separate table (redundant with Section 4)

## WHAT TO KEEP
- AI Summary paragraph with keyword formatting
- 3-box metrics layout
- Category progress bars with icons
- Transaction table structure
- Confidential footer
