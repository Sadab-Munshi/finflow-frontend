# FinFlow — Budget Page Full Redesign

## OVERVIEW
Complete redesign of the Budget page including
list view, cards, and create/edit modal.
Keep all existing logic and data unchanged.
Only improve UI and UX.

---

## SECTION 1 — PAGE HEADER

```
Title: "Budgets" bold text-2xl
Right side: "+ Create Budget" button
  bg-teal-600 text-white rounded-xl
  px-4 py-2 font-semibold
  Plus icon on left
```

Below title add month navigation:
```
← [March 2026] →

Left arrow: go to previous month
Center: current selected month bold
Right arrow: go to next month
  DISABLE right arrow for future months
  Gray out and not clickable

Style: flex row centered, gap-4
Arrows: teal color, w-8 h-8 rounded-full
  bg-teal-50 hover:bg-teal-100
Month label: text-base font-semibold text-gray-800
```

Below navigation add summary bar:
```
3 small stat pills in a row:

[Total Budget: ₹X]  [Spent: ₹X]  [Remaining: ₹X]

Each pill:
  bg-white rounded-xl shadow-sm px-3 py-2
  Label: text-xs text-gray-400
  Value: text-sm font-bold
  
Total Budget: text-gray-800
Spent: red if over total, gray if under
Remaining: green if positive, red if negative
```

---

## SECTION 2 — BUDGET CARDS LIST

Each budget card:

```
CARD CONTAINER:
  bg-white rounded-2xl shadow-sm
  mb-3 overflow-hidden
  
  Left border color based on status:
    Under 50%:  border-l-4 border-green-500
    50% - 80%:  border-l-4 border-amber-500
    Over 80%:   border-l-4 border-red-500

CARD HEADER ROW:
  Display: flex items-center justify-between
  Padding: p-4 pb-2

  Left side:
    Category icon in colored circle (existing)
    Category name: font-semibold text-gray-800
    Month below name: text-xs text-gray-400
      Format as "February 2026" not "2026-02"

  Right side:
    Status badge pill:
      Under 50%: bg-green-50 text-green-700 
        "On Track"
      50-80%: bg-amber-50 text-amber-700 
        "Near Limit"
      Over 80%: bg-red-50 text-red-700 
        "Over Budget"
      Font-size: text-xs font-semibold
      Padding: px-2.5 py-1 rounded-full
    
    Edit icon: pencil, text-gray-400
    Delete icon: trash, text-red-400
    Both: w-4 h-4, tap targets w-8 h-8

STATS ROW:
  Padding: px-4 py-2
  Three rows:

  Row 1: "Budget Amount" left, ₹value right
    text-sm text-gray-500 / text-sm font-medium text-gray-800

  Row 2: "Spent" left, ₹value right
    text-sm text-gray-500 / 
    value color: green if under 80%, red if over

  Row 3: "Remaining" left, ₹value right
    text-sm text-gray-500 /
    If positive: green "₹X remaining"
    If negative: red "₹X over"

PROGRESS BAR:
  Margin: mx-4 mb-1
  Container: h-2 bg-gray-100 rounded-full
  
  Fill bar:
    height: 100% rounded-full
    Width: min(percentage, 100%)
    Color based on percentage:
      0-50%:   #16A34A green
      51-80%:  #D97706 amber
      81-100%: #DC2626 red
    
    Smooth transition: transition-all duration-500

PERCENTAGE LABEL:
  Right aligned below bar
  px-4 pb-3
  Show ACTUAL percentage even if over 100%:
    "65% used" or "340% used"
  Color matches bar color
  text-xs font-medium
```

---

## SECTION 3 — EMPTY STATE

When no budgets for selected month:

```
Center aligned card:
  bg-white rounded-2xl p-8 text-center

  Icon: Wallet from lucide
    w-16 h-16 text-teal-300 mx-auto mb-4

  Title: "No budgets for {month}"
    font-semibold text-gray-700 text-base

  Subtitle: "Create a budget to track your 
    spending and stay on top of your finances."
    text-sm text-gray-400 leading-relaxed mt-1

  Button: "+ Create Budget"
    bg-teal-600 text-white rounded-xl
    px-6 py-2.5 font-semibold mt-4
    Opens create modal on tap
```

---

## SECTION 4 — CREATE BUDGET MODAL

Triggered by: "+ Create Budget" button

```
BACKDROP:
  bg-black/40 backdrop-blur-sm
  Full screen overlay

MODAL CONTAINER:
  bg-white rounded-t-3xl (bottom sheet style)
  Fixed at bottom on mobile
  Max-width 480px centered on desktop
  
  Open animation:
    translateY(100%) → translateY(0)
    opacity 0 → 1
    duration 300ms ease-out
  
  Close animation: reverse

MODAL HEADER:
  Gradient background: #0D9488 → #059669
  Padding: p-5
  
  Title: "Create Budget" white font-bold text-lg
  Subtitle: "Set a spending limit for a category"
    white/80 text-sm mt-0.5
  
  Close button top-right:
    X icon white, w-8 h-8 rounded-full
    bg-white/20 tap to close

CATEGORY SELECTOR:
  Label: "Category" text-sm font-semibold 
    text-gray-700 mb-2 mt-4 px-5

  Grid: 3 columns, gap-2, px-5
  
  Each category pill:
    Unselected:
      bg-gray-50 border border-gray-200
      rounded-xl p-2.5 text-center
      Icon: w-5 h-5 category color
      Name: text-xs text-gray-600 mt-1
    
    Selected:
      bg-teal-50 border-2 border-teal-500
      rounded-xl p-2.5 text-center
      Icon: w-5 h-5 text-teal-600
      Name: text-xs text-teal-700 font-semibold
    
    Scale animation on select: scale-95 → scale-100
  
  Categories to show:
    Food & Dining, Transport, Health,
    Shopping, Bills & Utilities, Entertainment,
    Education, Groceries, Personal Care, Other

AMOUNT FIELD:
  Label: "Budget Amount" text-sm font-semibold
    text-gray-700 mb-2 mt-4 px-5

  Input container: mx-5
    bg-gray-50 rounded-xl border border-gray-200
    focus-within:border-teal-500
    focus-within:ring-2 focus-within:ring-teal-100
    flex items-center px-4

  Left: "₹" text-gray-500 font-semibold text-lg
  Input:
    flex-1 bg-transparent py-3.5
    text-xl font-bold text-gray-800 outline-none
    type="number" placeholder="0"

  Quick amount pills below input: mx-5 mt-2
    Horizontal row: flex gap-2 flex-wrap
    Pills: ₹500, ₹1,000, ₹2,000, ₹5,000, ₹10,000
    
    Each pill:
      bg-teal-50 text-teal-700 text-xs
      rounded-full px-3 py-1.5
      border border-teal-200
      font-medium
      On tap: set amount input to that value

MONTH SELECTOR:
  Label: "Month" text-sm font-semibold
    text-gray-700 mb-2 mt-4 px-5

  Horizontal scroll row: px-5
    Show last 6 months + current month
    Future months: disabled, grayed out
    
    Each month pill:
      Past/Current unselected:
        bg-gray-100 text-gray-600
        rounded-full px-4 py-2 text-sm
        font-medium shrink-0
      
      Selected:
        bg-teal-600 text-white
        rounded-full px-4 py-2 text-sm
        font-semibold shrink-0
      
      Future (disabled):
        bg-gray-50 text-gray-300
        rounded-full px-4 py-2 text-sm
        cursor-not-allowed shrink-0
    
    Format each as: "Mar 2026" "Feb 2026" etc
    Default selected: current month
    Scroll horizontally to show all

FOOTER BUTTONS:
  Padding: p-5 pt-4
  Flex row gap-3

  Cancel button:
    flex-1 border border-gray-200
    rounded-xl py-3 text-gray-600
    font-medium text-sm
    On tap: close modal, reset form

  Create Budget button:
    flex-1 rounded-xl py-3
    font-semibold text-sm
    
    Disabled (default):
      bg-gray-100 text-gray-400
      cursor-not-allowed
    
    Enabled (category + amount + month selected):
      bg-teal-600 text-white
      hover:bg-teal-700
    
    Loading:
      bg-teal-600 text-white
      Show spinner + "Creating..."
      Pointer-events-none
    
    Success:
      Brief green flash + checkmark
      Then close modal with slide-down animation
      Show toast: "Budget created successfully!"
```

---

## SECTION 5 — EDIT BUDGET MODAL

Same design as Create Budget modal but:

```
Header title: "Edit Budget"
Header subtitle: "Update your spending limit"

Pre-fill all fields with existing values:
  Category: pre-selected (not changeable)
    Show as static selected pill, not tappable
  Amount: pre-filled
  Month: pre-selected (not changeable)
    Show as static selected pill, not tappable

Footer button:
  "Save Changes" instead of "Create Budget"
  Same states: disabled/enabled/loading/success
  Success toast: "Budget updated successfully!"
```

---

## SECTION 6 — DELETE CONFIRMATION

When delete icon tapped:

```
Show small bottom dialog (not full modal):

  bg-white rounded-2xl p-5 mx-4
  Shadow-xl

  Icon: Trash2 w-10 h-10 text-red-500 mx-auto
  Title: "Delete Budget?" font-bold text-center
  Description: "Delete {category} budget 
    for {month}? This cannot be undone."
    text-sm text-gray-500 text-center mt-1

  Two buttons:
    "Cancel": outlined gray rounded-xl py-2.5 flex-1
    "Delete": bg-red-500 text-white rounded-xl 
      py-2.5 flex-1

  On confirm:
    Delete from database
    Remove card with fade-out animation
    Toast: "Budget deleted"
```

---

## DATE FORMAT FIX

Throughout entire budget page:
```
Replace all "2026-02" format displays with
"February 2026" using this:

const MONTHS = [
  'January','February','March','April',
  'May','June','July','August',
  'September','October','November','December'
]

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-')
  return `${MONTHS[parseInt(month) - 1]} ${year}`
}
```

---

## ANIMATIONS SUMMARY

```
Page load:     Cards fade in staggered 
               (each card 50ms delay)
Modal open:    Slide up 300ms ease-out
Modal close:   Slide down 200ms ease-in
Card delete:   Fade out + collapse height
Category tap:  Scale bounce 150ms
Create success:Green flash then slide close
Progress bar:  Animate width on mount 500ms
```

---

## RESPONSIVE RULES

```
Mobile:  Full width cards, bottom sheet modal
Tablet:  Cards max-w-2xl centered, 
         modal centered dialog not bottom sheet
Desktop: Same as tablet, more padding
```

---

## ICONS FROM LUCIDE-REACT

```typescript
import {
  Wallet, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, X,
  Check, Loader2, BarChart3
} from 'lucide-react'
```

---

## WHAT NOT TO CHANGE

```
- Budget data fetching logic
- Budget creation/update/delete API calls
- Authentication and user session
- Future month restriction logic (keep as is)
- Category list and icons
```
