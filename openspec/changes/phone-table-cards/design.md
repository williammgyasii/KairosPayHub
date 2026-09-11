## Context

See proposal.md — Why. Every roster, attendance, and giving list today wraps a `min-w-[640px]`–`[1400px]` `<table>` in `overflow-x-auto`. There is no shared phone layout. Existing `Modal` already handles title + body + Escape. Membership already has row badges and a ⋯ menu.

## Goals / Non-Goals

**Goals:**

- One manager answers “what goes on the card / in the details list” from column fields (no `Fellowship` / `Cell` string gates).
- One engine renders cards + the details modal; each table supplies fields and optional ⋯ slot.
- Switch at Tailwind `md` (768px): phone cards, tablet+ grid.

**Non-Goals:**

- Changing column prefs, search, or paging APIs.
- Replacing member profile / edit sheets (⋯ still opens those).
- Phone layouts for wizards, calendars, metric chips, or the mark-attendance sheet.

## Decisions

### Manager vs engine

`phoneListCard({ title, lines, details })` is the manager: given labeled fields, pick title + two lines + the full detail pairs (skip empty title; lines max 2). The engine (`PhoneList` + details `Modal`) never decides which member fields exist.

Per-table adapters map that table’s row + column headers into `{ id, title, lines, details, badges?, actions? }`. Adapters are the only place Membership vs Giving differ.

**Alternative considered:** CSS-only `hidden md:table` with the same wide table. Rejected — still a squeezed grid, no details modal.

### Breakpoint

Use `window.matchMedia('(max-width: 767px)')` (same as Tailwind `md`) so only one layout mounts. Do not render both the table and the cards.

### Details modal

Reuse `components/ui/modal.tsx`. Body is a definition list of every desktop column for that row (em dash when empty), not only Columns-toggled visible ones — phone hid those columns on purpose.

**Exception:** if the table already has a richer row-detail surface (Approvals → review modal, a contribution detail modal), card tap opens that surface instead of the generic column dump. ⋯ / explicit action buttons stay for mutations.

### Card chrome

Card is a button-like row: title + badges, two muted lines, ⋯ absolutely not inside the tap target that opens details (`stopPropagation` on the actions slot). Pending tone reuses `membershipRowToneClass`.

### Tables in scope

Wire the engine into:

- Roster: `structure-member-table`, `structure-unit-node-table`
- Attendance: `attendance-all-table`, by-units tables in `attendance-overview-detail-tabs`, `attendance-approval-queue`
- Giving: `giving-table`, `member-giving-rankings-table`, `contributions-approval-table`, `recent-activity-table`, `contributions-history-table`, `contributions-structure-table`, member givings table, `giving-transactions-ledger`, `sub-givings-panel`

Leave overview dashboard mini-tables and unit-sheet nested tables for a follow-up if they still squeeze after this pass.

## Risks / Trade-offs

- [Duplicate a11y content if both layouts mount] → mount one layout from matchMedia.
- [Card tap vs ⋯ collision] → actions slot stops propagation; tests cover both.
- [Many call sites drift] → adapters stay thin; engine owns chrome.

## Migration Plan

Frontend-only. Deploy with the next `main` / tag. No DB migration. Rollback is revert the UI commit.

## Open Questions

None that block the task breakdown.
