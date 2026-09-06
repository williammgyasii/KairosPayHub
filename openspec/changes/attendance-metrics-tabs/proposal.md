## Why

Occurrence metrics currently stack summary tiles plus two full tables (unit status and who showed up), which feels dense and hard to scan. Leaders need one clear roster view and a separate structure/group view without losing filters or useful columns.

## What Changes

- Slim the top summary strip to four tiles: Present, Members, First-timers, Pending.
- Replace stacked sections with tabs: **Who showed up** (flat attendance roster) and **By unit** (submission/status + structure grouping).
- Who showed up: columns Name, Unit, Type, Phone, Invited by; search/type/unit filters; column show/hide (including optional parent unit / fellowship when available).
- By unit: former unit roll-call status table lives here; support grouping by submission unit and by parent unit when applicable.
- Remove the duplicate vertical “Unit roll calls” + “Who showed up” stacked layout.

## Capabilities

### New Capabilities

- `attendance/metrics-detail`: Tabbed occurrence metrics detail (summary strip + Who showed up + By unit).

### Modified Capabilities

- (none under `openspec/specs/` yet; prior deltas live in active changes)

## Impact

- Frontend: `AttendanceOverviewPage` and related attendance UI helpers/tests.
- API (small): optional parent-unit name on rollup person rows for fellowship column / group-by parent.
- Specs: new delta under this change; updates prior metrics-navigation intent.
