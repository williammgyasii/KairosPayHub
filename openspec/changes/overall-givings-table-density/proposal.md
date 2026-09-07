## Why

Overall givings freezes Rank + Member + Approved total (~368px) on every viewport and defaults every campaign column on. On phones/tablets the sticky block owns the screen, and as campaigns grow the spreadsheet becomes unusable without hunting through horizontal scroll.

## What Changes

- Make sticky identity columns **responsive**: fewer sticky columns on narrow viewports; full trio only on large screens.
- Tighten **default column visibility**: core columns on; per-campaign amount columns off by default (still available via Columns).
- Bump column-visibility storage key so denser defaults apply for returning users who never customized intent.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `giving/overall-member-totals`: Sticky column rules become viewport-aware; default visibility no longer enables every campaign column.

## Impact

- Frontend: `overall-givings-table.ts`, `member-giving-rankings-table.tsx`, unit tests.
- No API changes.
