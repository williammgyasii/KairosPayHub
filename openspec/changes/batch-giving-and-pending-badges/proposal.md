## Why

Bulk log giving currently creates N contributions with a shared `batchId`, but each create fires its own pending notification and recent-activity UIs show N rows. Approvers also lack a clear signal on the campaigns list when contributions await their review. Logging also briefly unmounts the Log giving modal during RTK refetch, which feels like a second “uploading” modal.

## What Changes

- Add a batch contribution create endpoint that creates all rows in one flow and sends **one** batch pending notification (single create still sends one single notification).
- Group batch contributions as **one row** in recent activity (awaiting approval already groups).
- Keep the Log giving modal mounted during background refetch after submit.
- Surface awaiting-approval counts on campaigns (table badge/link + Givings sidebar badge for roles that approve).

## Capabilities

### New Capabilities

- `giving/batch-contributions`: Atomic batch create + single batch notification; activity tables treat batches as one unit.

### Modified Capabilities

- `giving/contributions`: Program list includes awaiting-my-approval counts for campaign badges; notification links use awaiting tab where appropriate.

## Impact

- API: `ContributionService`, `NotificationService`, `GivingProgramDto`, `GivingController`
- Frontend: log wizard, recent activity, campaigns table, sidebar, ProgramDetailPage refetch
- Tests: contribution/notification integration + frontend batch grouping
