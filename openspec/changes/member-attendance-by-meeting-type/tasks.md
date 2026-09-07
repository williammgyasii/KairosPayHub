## 1. API

- [x] 1.1 Extend history DTO/service with `meetingTypeId` filter, item `meetingTypeId`, and `meetingTypes[]` summaries
- [x] 1.2 Integration tests for filter + meetingTypes zeros; verify pass (or live contract if Docker unavailable)

## 2. Frontend

- [x] 2.1 RTK/query args for `meetingTypeId`; types updated
- [x] 2.2 Member attendance page: meeting-type tabs + scoped metrics/table

## 3. Verification

- [x] 3.1 Playwright: open member attendance, switch meeting type, assert UI + live API filter
- [x] 3.2 Restart local servers
