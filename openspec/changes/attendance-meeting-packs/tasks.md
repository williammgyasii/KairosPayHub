## 1. Pack policy

- [x] 1.1 Add failing unit tests for pack completeness (note or file), rejected empty pack, allowed PDF/images, church-wide vs scoped audience helpers on the FE manager. Verify they fail.
- [x] 1.2 Implement `meetingPackPolicy` (pure, no JSX, no meeting-title gates). Verify the tests in 1.1 pass.

## 2. Pack API

- [x] 2.1 Add failing integration tests: pastor can publish note+file; empty publish is 400; cell leader is 403; GET by leader records seen; download records downloaded and returns bytes; public URL is not in the pack DTO; church-wide publish notifies fellowship/cell leaders not members; unchanged replace does not notify again. Verify they fail.
- [x] 2.2 Add pack/file/receipt entities, migration, `AttendanceMeetingPackPolicy` + `AttendanceMeetingPackService` + sibling controller, audience on `NotificationRecipientResolver`, `AttendanceMeetingPackPublished` notify. Verify the tests in 2.1 pass. Do not grow `AttendanceController` or `AttendanceMeetingTypeService`.

## 3. Attendance UI

- [x] 3.1 Add Share / notes for this meeting on the Attendance occurrence (compose + audit for church managers; read + download for leaders). Verify a component test: no pack hides the audit; a pack shows the note and files; cell leader does not see Share. Restart API + frontend after the chunk.
- [x] 3.2 Move pastor compose to Attendance → Share files (meeting, then day, dashed form). Keep leader read on Mark attendance. Meeting types stays types-only.
