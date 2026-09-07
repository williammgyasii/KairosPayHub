## Why

Member attendance is meaningless as one blended stream: Present on Sunday is not the same as Present on Midweek. Pastors need to scope a member’s attendance page by meeting type (and see per-type totals).

## What Changes

- Extend `GET /api/attendance/members/{memberId}/history` with optional `meetingTypeId` filter and a `meetingTypes[]` summary (id, title, present/absent/recorded).
- Member attendance UI: meeting-type tabs/selector; metrics + table reflect the selected type.
- Contract/integration tests + Playwright covering type switching.

## Capabilities

### New Capabilities

- `attendance/member-history-by-meeting-type`: Meeting-type scoped member attendance history API and page.

### Modified Capabilities

- (none archived)

## Impact

- API: `AttendanceMemberHistoryService`, contracts, controller query param
- FE: member attendance page + RTK query args
- Tests: integration + Playwright
