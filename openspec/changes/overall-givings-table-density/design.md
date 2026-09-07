## Context

See proposal.md. Sticky widths live in `overall-givings-table.ts`; table applies them in `member-giving-rankings-table.tsx`. Default visibility currently sets every `campaign:*` column to `true`.

## Goals / Non-Goals

**Goals:**
- Viewport-tiered sticky sets
- Denser defaults (hide campaign amount columns)
- Tests for helpers; table uses matchMedia/resize for tier

**Non-Goals:**
- Removing spreadsheet campaign columns entirely
- Server-side column prefs
- Redesigning the Columns UI

## Decisions

1. **Sticky tiers by width**  
   - `<768`: sticky `memberName` only (left 0)  
   - `768–1023`: sticky `rank` + `memberName`  
   - `≥1024`: sticky `rank` + `memberName` + `approvedTotal`  
   *Alt:* no sticky on mobile — worse for scanning names while scrolling campaigns.

2. **Defaults**  
   Visible: rank, memberName, approvedTotal, approvedCount, lastDateSent, actions, structure layers.  
   Hidden: all `campaign:*`, pending columns (already hidden).  
   Storage key → `*-v3` so old “everything on” prefs reset once.

3. **API for helpers**  
   `stickyTierForWidth(width)`, `stickyColumnLeft(id, tier)`, `stickyColumnWidth(id, tier)` — pure functions, easy to unit test. Table uses `window.innerWidth` + resize listener (or matchMedia).

## Risks / Trade-offs

- [Users who relied on all campaign columns visible] → One-time reset via v3 key; Columns menu restores them.  
- [Resize mid-session] → Recalculate sticky left offsets; brief layout shift acceptable.

## Migration Plan

Frontend-only. Bump localStorage keys. Rollback = revert FE.
