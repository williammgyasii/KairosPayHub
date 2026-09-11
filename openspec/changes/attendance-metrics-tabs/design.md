## Context

`AttendanceOverviewPage` currently renders OverviewMetrics (6 tiles), then Unit roll calls, then Who showed up — three vertical blocks. Rollup API already returns present people + aggregate counts; occurrence detail returns scope submissions.

## Goals / Non-Goals

- Goals: less vertical clutter; tabbed IA; fewer tiles; column visibility + filters on roster; unit/group view on second tab.
- Non-Goals: rebuilding metrics as a full data-grid product; changing approval rules; exporting.

## Decisions

1. **Chips** — Present (total), Guests, and First timers. Pending only when > 0. No Absent. Approved units stay on Attendance by units.
2. **Tabs** — Reuse `StructurePageTabs` pattern (Who showed up | By unit). Counts: people totalCount / unit sheet count.
3. **Parent unit** — Add `parentUnitName` on `AttendancePresentPersonDto` from structure parent node for optional column + By unit group-by parent.
4. **Column visibility** — Local React state (session); default: name, unit, type, phone, invitedBy on; parentUnit off until toggled.
5. **Group by** — Client-side grouping of scope submissions using parent map from structure nodes (or parent name on submissions if we extend DTO). Prefer loading parent names with occurrence/scope list once.

## Risks

- Parent missing → group-by-parent falls back to flat unit list.
- Pastors without Approvals still see Pending tile (read-only signal).

## Migration

- None.
