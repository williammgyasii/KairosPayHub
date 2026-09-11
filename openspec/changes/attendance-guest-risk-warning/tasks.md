## 1. Manager

- [x] 1.1 Add failing unit tests for guest-risk: ordinary sheet → `clear`; guest/member imbalance → `watch`/`flagged`; all-new phones → `watch`; same name many phones or same phone many names → `flagged`. Verify tests fail.
- [x] 1.2 Implement the manager (pure function, no role string gates). Verify 1.1 passes.

## 2. Persist on submit

- [x] 2.1 Add `GuestRiskLevel` + `GuestRiskReasons` on `attendance_scope_submissions` (backfill `clear`). Verify migration applies on the test database.
- [x] 2.2 Add failing integration test: submit a padded invitee sheet → stored/API result is `watch` or `flagged` with an imbalance reason; a normal sheet is `clear`. Verify it fails.
- [x] 2.3 Sibling service gathers snapshot + prior present phones and scores on submit (do not grow `AttendanceSubmissionService` / `AttendanceApprovalService` into gods). Verify 2.2 passes.
- [x] 2.4 Confirm Add invitee still succeeds for a duplicate Ama name (existing create path). Verify with an API or existing invitee test.

## 3. Approvals UI

- [x] 3.1 Expose `guestRiskLevel` + `guestRiskReasons` on approval queue and review DTOs. Verify the submit/queue integration test returns them.
- [x] 3.2 Paint a warning on the Approvals queue row and review detail when not `clear`; Approve stays enabled. Verify with a frontend test of the warning presentation.
- [x] 3.3 Restart API + frontend. Smoke: submit a padded Titans Cell sheet as cell leader; sign in as fellowship leader; warning shows; Approve still works.
