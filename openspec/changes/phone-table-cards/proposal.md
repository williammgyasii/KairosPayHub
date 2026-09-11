## Why

On a phone, list screens still render the desktop column grid inside a horizontal scroller. Leaders cannot scan a roster, attendance sheet, or giving list with one thumb. Tablet and desktop already work; phone needs a different shape, not a squeezed table.

## What Changes

- Below the tablet breakpoint (`md`, 768px), every product list table becomes a stacked card list.
- Each card shows a title, two secondary lines, existing badges (You / New / Pending), and the row ⋯ menu when the table has one.
- Tapping the card (not the ⋯) opens a details modal that lists every desktop column as label / value.
- Tablet and desktop keep the existing grid. Search, filters, sort, paging, and column prefs stay as they are.

## Capabilities

### New Capabilities

- `ui/phone-list`: Phone stacked cards + full-row details modal for product list tables; tablet/desktop unchanged.

### Modified Capabilities

- (none)

## Impact

- Frontend only: shared manager + card/modal engine; each existing list table switches layout below `md`.
- No API or schema changes.
- No change to member profile pages, edit sheets, or approval actions — ⋯ still owns those.
