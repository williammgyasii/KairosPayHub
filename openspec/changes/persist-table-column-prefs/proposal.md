## Why

Roster Units has no Columns control, and Membership / Attendance / Giving column toggles die on refresh (session or this-browser `localStorage`). Leaders expect the same Columns menu on Units, and their choices to follow the login on any device.

## What Changes

- Roster → Units gains a Columns menu like Membership. Name stays always on; Parent and Members are toggleable (default on).
- Column visibility for Units, Membership, Attendance (Who showed up), and Giving (overall + campaign) is stored per signed-in user in the database.
- `GET` / `PUT` under `/api/me/table-preferences` load and save keyed maps. Unknown column ids merge with each table’s defaults.
- Giving stops relying on `localStorage` after the first successful save (one-time migrate if the DB row is empty).

## Capabilities

### New Capabilities

- `account/table-preferences`: Per-login keyed column maps; GET/PUT; merge with defaults; always-on columns cannot be hidden.
- `roster/units-column-visibility`: Units table Columns control (Name locked on; Parent and Members toggleable).

### Modified Capabilities

- (none)

## Impact

- API: `user_table_preferences` table + migration, me preferences endpoints, integration tests.
- Frontend: Units Columns wiring; Membership / Attendance / Giving read and write the API instead of session/`localStorage`.
- No church-scoped prefs, no column reorder, no Attendance By-unit columns in this change.
