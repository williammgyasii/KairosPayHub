## Why

Mark attendance currently dumps meeting pickers and the full roll-call sheet on one page. Leaders need a clearer two-step flow, tighter action buttons, clearer member marking affordances, and invitee/first-timer consolidation. Metrics should stay read-only. Local Canada Church testing needs multiple past Saturdays and several meeting types to exercise the picker UI.

## What Changes

- Two-step Mark attendance wizard: (1) choose meeting + service date, (2) mark members/invitees and save/submit
- Upcoming locked occurrence shown beside the Mark attendance header (date + why locked)
- Compact Save draft / Submit buttons with icons and in-button spinners (no blocking loading modal)
- Members: click = present, double-click = absent, with a short hint
- Remove separate First timers tab; first-timer stays an invitee attribute/toggle
- Metrics: remove Mark attendance CTA
- Dev seed for Canada Church: ~4 past Saturdays on Cell meetings + 3–4 extra meeting types

## Capabilities

### New Capabilities
- `attendance/mark-attendance-wizard`: Two-step mark flow, member click semantics, invitee consolidation, metrics read-only

### Modified Capabilities
- None (delta lives under attendance mark wizard)

## Impact

- Frontend: `AttendanceSubmissionsPage`, roll-call sheet/grid, invitee modal copy, overview metrics CTAs, approval detail tabs
- Backend/data: optional seed script or one-off SQL/API seeding for Canada Church test data
- OpenSpec: this change’s specs/tasks
