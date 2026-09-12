## 1. Report policy manager

- [x] 1.1 Add failing unit tests for `reportPolicy`: default schema when toggle turns on with empty schema; custom Sunday vs Cell schemas stay distinct; completeness is false if required text is blank or required photos has zero URLs; completeness is true when required fields are filled; no-report type has `required: false`. Verify they fail.
- [x] 1.2 Implement `reportPolicy` (pure, no JSX, no meeting-title string gates). Verify the tests in 1.1 pass.

## 2. Meeting type API

- [x] 2.1 Add failing integration tests: create with requires-report seeds the default schema; update can replace prompts (long text + photos only); create without the flag stores no required report; anonymous create is 401. Verify they fail.
- [x] 2.2 Add `RequiresReport` + `ReportSchema` on `AttendanceMeetingType`, migration (existing rows false / empty), and persist on create/update. Verify the tests in 2.1 pass.

## 3. Submit gate and photos

- [x] 3.1 Add failing integration tests: submit on a report-required type without a complete payload is 400 and stays draft; submit with required text + at least one photo URL is 200/pending; save draft with a partial report succeeds; a no-report type still submits as today. Verify they fail.
- [x] 3.2 Add `ReportPayload` on the scope submission, completeness check in a sibling report service on submit, and a photo upload endpoint (object storage, JPEG/PNG/WebP, 2 MB, max 5 per prompt). Verify the tests in 3.1 pass. Do not grow `AttendanceMeetingTypeService` with upload/submit logic.

## 4. Meeting-type form

- [x] 4.1 Add the requires-report toggle and schema editor (add / remove / rename / required, long text + photos) to the meeting-type form. Verify a unit/component test: turning the toggle on with an empty schema shows the default four prompts; two types can save different schemas.

## 5. Wizard and approvals

- [x] 5.1 Add the report step after the roll-call sheet when `reportPolicy` says required; Submit stays disabled until complete; Save draft does not. Verify a component test: no-report type has no report step; incomplete required photos keeps Submit off.
- [x] 5.2 Show prompt labels, answers, and photos on approval / submission detail when a payload exists. Verify a test: a sheet with no report does not render an empty report block. Restart API + frontend after the chunk.

## 6. Submit notify + approval panes

- [x] 6.1 Add failing tests: pending-approval copy names submitter · role, unit, meeting, and roll call vs meeting report; approval detail shows Report only when a payload exists and keeps roll call on its own pane. Verify they fail.
- [x] 6.2 Implement `AttendanceSubmitNotificationCopy` + approval Roll call / Report panes. Verify the tests in 6.1 pass. Restart API + frontend.
