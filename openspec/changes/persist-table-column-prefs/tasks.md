## 1. Units column manager

- [x] 1.1 Add `units-table-columns.ts` (ids, labels, defaults, merge, Name always on) and failing unit tests for defaults + hide Parent. Verify the tests fail before implementation, then pass.
- [x] 1.2 Add Columns to Roster Units (`RosterDataTable`) using the same toggle chrome as Membership. Verify the Units visibility tests (or roster-view test) pass: Name locked; Parent/Members toggle without changing row count.

## 2. Preferences API

- [x] 2.1 Add failing API integration tests: empty GET; PUT allowed key then GET; unknown key 400; always-on hide forced visible; user B cannot read user A. Verify they fail.
- [x] 2.2 Add `user_table_preferences` + `UserTablePreferenceService` + GET/PUT `/api/me/table-preferences`. Apply the migration on **dev** only. Verify the tests in 2.1 pass.

## 3. Persist existing tables

- [x] 3.1 Add a small FE client + merge hook (load GET, debounce PUT). Verify unit tests: missing key → defaults; saved overlay; new column stays default.
- [x] 3.2 Wire Membership, Attendance Who-showed-up, Units, and Giving (overall + campaign). Giving: promote `localStorage` once then remove that key. Verify helper tests for the Giving migrate path.

## 4. Verify

- [x] 4.1 Run the new FE unit tests and API integration tests (Docker if available). Restart local API + frontend.
- [ ] 4.2 Smoke on **dev**: hide Parent on Units, hide Email on Membership, refresh / other browser as the same login — both stay. A second login still sees defaults.
