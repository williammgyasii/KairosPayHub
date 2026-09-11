## 1. API

- [x] 1.1 Add failing integration test: pastor creates meeting type; cell leader and church admin get `MeetingTypeCreated`; pastor unread stays 0; edit does not add another. Verify it fails.
- [x] 1.2 Add `NotificationKind.MeetingTypeCreated`, `ForChurchLeadersAndAdminsAsync`, and `MeetingTypeNotificationService`. Call it from meeting-type create. Verify the test in 1.1 passes.

## 2. Client

- [x] 2.1 Add `MeetingTypeCreated` to the frontend notification kind union. Verify TypeScript still typechecks notifications.
- [ ] 2.2 Restart API + frontend. Smoke: create a meeting type as pastor, sign in as a cell leader, confirm the bell.
