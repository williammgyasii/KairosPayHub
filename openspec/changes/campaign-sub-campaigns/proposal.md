## Why

Campaigns today force all logging onto sub-givings once any sub-giving exists, which blocks general offerings on the main campaign (e.g. "Sunday Services" pool vs a specific Sunday). Leaders also need a clearer create flow (name, type, timeline, go-live) and recurring sub-campaign generation (every Sunday in a date range, log opens the next day).

## What Changes

- **Dual giving**: Main campaigns and sub-campaigns both accept contributions; parent totals include direct + sub-campaign amounts.
- **Main campaign wizard**: Name → type (dropdown + Other) → timeline (start/end) → go-live (today or scheduled) → scope → review.
- **Sub-campaign wizard**: One-off or recurring (e.g. every Sunday), date range, preview count, batch-create instances; optional log-opens offset (event Sunday, log from Monday).
- **Legacy flag**: Parent contributions logged *before* the first sub-campaign was created remain flagged; new parent contributions are not legacy.
- **Scheduled go-live**: Delay leader notifications until go-live date; campaign visible but not loggable until then (draft/scheduled state).

## Capabilities

### New Capabilities

- `giving/campaign-wizard`: Main campaign creation flow with name, type, timeline, and go-live.
- `giving/recurring-sub-campaigns`: Recurring sub-campaign rules, batch generation, and log-window offset.

### Modified Capabilities

- `giving/contributions`: Parent campaigns accept contributions alongside sub-campaigns; rollup includes both; legacy flag semantics updated.

## Impact

- **API**: `GivingProgram` entity (dates, go-live, scheduled status), create program request, contribution guards, rollup/totals, sub-campaign batch endpoint.
- **Frontend**: `create-program-wizard.tsx`, `create-sub-period-wizard.tsx`, `program-dashboard.tsx`, giving API types.
- **Tests**: `NestedGivingApiTests.cs`, new campaign wizard and recurrence integration tests.
