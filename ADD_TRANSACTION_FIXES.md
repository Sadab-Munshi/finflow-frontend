# FinFlow — Add Transaction Fixes

## OVERVIEW
Fix future date prevention across all input methods,
add voice preview before saving, split code into
separate components, and improve manual form UI.

---

## FIX 1 — FUTURE DATE PREVENTION (All Methods)

### Rule
If user inputs or speaks a future date,
silently replace it with today's date.
Never show an error — just use today.

### Create shared utility
File: `lib/validateTransactionDate.ts`

```typescript
export function validateTransactionDate(
  dateInput: string | Date | null | undefined
): string {
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  if (!dateInput) {
    return new Date().toISOString().split('T')[0]
  }

  const inputDate = new Date(dateInput)

  if (isNaN(inputDate.getTime())) {
    return new Date().toISOString().split('T')[0]
  }

  if (inputDate > today) {
    return new Date().toISOString().split('T')[0]
  }

  return inputDate.toISOString().split('T')[0]
}
```

### Apply to Manual Tab
In manual form date input:
- Set `max` attribute to today's date
- Also run through `validateTransactionDate`
  before saving

```typescript
max={new Date().toISOString().split('T')[0]}
```

### Apply to NLP Tab
After parsing date from AI response,
wrap it before saving:
```typescript
const safeDate = validateTransactionDate(parsedDate)
```

### Apply to Voice Tab
After parsing date from voice transcript,
wrap it before saving:
```typescript
const safeDate = validateTransactionDate(parsedDate)
```

### Apply to Scan Tab
After parsing date from scanned content,
wrap it before saving:
```typescript
const safeDate = validateTransactionDate(parsedDate)
```

---

## FIX 2 — VOICE: CANCEL + PREVIEW BEFORE SAVE

### Current flow (bad)
Record → auto save to server

### New flow
Record →(auto stop 15 sec.as it is/and also user can stop manual within 15 second,) Stop → Show preview → Confirm or Re-record → Save

### Preview card UI
After voice recording stops and is parsed,
show a preview card before saving:
Ai confidence percentage.Should be as it is .
```
┌─────────────────────────────────┐
│  🎤 Voice captured              │
│                                 │
│  Amount:    ₹2,500              │
│  Type:      [Expense]           │
│  Category:  🍽️ Food & Dining    │
│  Date:      30 Mar 2026         │
│  Note:      lunch               │
│    Ai confidence percentage .                           │
│  [Re-record]  [Save Transaction]│
└─────────────────────────────────┘
if possible add three.js effect in small in round shape while on record.
```

- "Re-record" button: outlined gray, clears preview,
  restarts recording
- "Save Transaction" button: teal, saves to database
- If parsing fails: show error message + Re-record only
- Do NOT save anything until user taps Save

### Cancel button during recording
Show a "Cancel" button while recording is in progress.
On tap: stop recording, discard audio, return to idle.
Do not send anything to server.

---

## FIX 3 — SPLIT INTO SEPARATE COMPONENTS

### Current structure (bad)
```
app/add-transaction/page.tsx ← everything in one file
```

### New structure
```
app/add-transaction/
├── page.tsx                    (tab switcher only)
├── components/
│   ├── ManualTab.tsx           (manual form)
│   ├── NLPTab.tsx              (AI text input)
│   ├── VoiceTab.tsx            (voice recorder)
│   └── ScanTab.tsx             (camera/scan)
└── hooks/
    └── useTransaction.ts       (shared save logic)

lib/
└── validateTransactionDate.ts  (shared date util)
```

### page.tsx responsibilities
- Render tab bar: Manual | NLP | Voice | Scan
- Switch between tab components
- Pass onSuccess callback to each tab
- Nothing else

### Shared hook: useTransaction.ts
Move the save transaction logic here.
All 4 tabs import and use this hook.
```typescript
export function useTransaction() {
  const saveTransaction = async (data: TransactionData) => {
    // existing save logic
  }
  return { saveTransaction }
}
```

### Keep all existing functionality
Do not change any API calls, data structure,
or business logic. Only reorganize files.

---

## FIX 4 — MANUAL FORM UI IMPROVEMENTS

### Amount display
- Keep large centered ₹ symbol and amount
- Change amount text color dynamically:
  - Expense selected: `text-red-500`
  - Income selected: `text-green-500`
- Smooth color transition: `transition-colors duration-200`

### Type toggle
- Expense selected: `bg-red-500 text-white`
- Income selected: `bg-green-500 text-white`
- Unselected: `bg-gray-100 text-gray-500`
- Smooth transition: `transition-all duration-200`

### Category pills
- Keep horizontal scroll for quick access
- Add "More +" pill at end of scroll
- On tap: show all categories in bottom sheet
  Same 3-column grid as budget create modal
- Selected category: teal border + teal text

### Date field
- Keep "Today, 30 Mar 2026" display format
- Add `max` attribute set to today
- Future dates are blocked visually in picker
- Apply `validateTransactionDate` before saving

### Save button
- Disabled state when amount is 0 or empty:
  `bg-gray-100 text-gray-400 cursor-not-allowed`
- Enabled state: `bg-teal-600 text-white`
- Loading state: spinner + "Saving..."
- Success: brief green flash then close/reset

---

## IMPLEMENTATION ORDER

```
Step 1: Create lib/validateTransactionDate.ts
Step 2: Split page.tsx into 4 tab components
Step 3: Apply validateTransactionDate to all tabs
Step 4: Add voice preview and cancel button
Step 5: Apply manual form UI improvements
```

---

## WHAT NOT TO CHANGE

- NLP parsing logic
- Voice recording API
- Scan/OCR logic
- Transaction save API call
- Authentication and user session
- Category list and existing icons
- Tab switching animation
