## Context

Mark attendance is a single long page with dropdowns + full sheet. First timers are a third tab overlapping invitees. Metrics incorrectly offers Mark attendance.

## Goals / Non-Goals

**Goals:**
- Wizard: pick meeting+date → mark sheet
- Compact actions + button spinners
- Click present / double-click absent with hint
- Invitees only (first-timer flag on invitee)
- Metrics read-only
- Canada Church seed for multi-day / multi-type UI

**Non-Goals:**
- Full animated card redesign of meeting pickers (keep clear, denser controls)
- Changing approval API or submission-layer rules
- Removing first-timer data model (keep `wasFirstTimer` / `isFirstTimer`)

## Decisions

1. Wizard state stays client-side on `/attendance/submissions` (query params optional: `?type=&occurrence=` for deep link from step 1 continue).
2. First-timer tab removed in mark + approval UIs; invitee row/column retains first-timer yes/no and add-form checkbox.
3. Member grid: single click → Present; double-click → Absent (not toggle).
4. Seed is a one-off script/API helper for local Canada Church, not production migration.

## Risks

- Double-click may also fire click → debounce with short timer or ignore click when dblclick follows.
- Existing users expect toggle; hint text mitigates.
