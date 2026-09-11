## Purpose

Lets each signed-in user keep table column show/hide choices in the product so a refresh or another device shows the same columns.

## ADDED Requirements

### Requirement: Load and save column maps per login

The system SHALL store column visibility as a map of column id to boolean, keyed by a known table preference key, owned by the signed-in user’s auth id. GET SHALL return the caller’s saved maps (empty object when none exist). PUT SHALL upsert exactly one key for the caller. An unknown key MUST be rejected. A missing key MUST be treated as “use that table’s defaults.” Saved ids that the table no longer has MUST be ignored. Column ids the table gains later MUST keep their default until the user toggles them. Another user’s maps MUST NOT be returned or overwritten.

#### Scenario: Empty preferences use defaults

- **WHEN** a signed-in user with no saved maps opens a table that has Columns
- **THEN** that table shows its default visibility
- **AND** GET returns no entry for that key

#### Scenario: Toggle persists for the same user

- **WHEN** the user turns Email off on Membership and later opens Membership on a new session
- **THEN** Email stays hidden
- **AND** GET for that user includes `columns.roster.membership` with Email false

#### Scenario: Unknown key is rejected

- **WHEN** the user PUTs a key that is not one of the known table keys
- **THEN** the request is rejected
- **AND** no row is written

#### Scenario: New column stays at default

- **WHEN** a table later adds a column id the user has never saved
- **THEN** that column uses the table’s default visibility
- **AND** previously saved ids for that key still apply

#### Scenario: Maps stay private to the login

- **WHEN** user A has saved a map and user B GETs preferences
- **THEN** user B does not receive user A’s maps

### Requirement: Known table keys and always-on columns

The system SHALL accept only these keys: `columns.roster.units`, `columns.roster.membership`, `columns.attendance.who-showed-up`, `columns.giving.overall`, `columns.giving.campaign`. PUT MUST NOT persist an always-on column as hidden (Name / member name / actions). Giving MUST prefer the saved map over browser-only storage; if the user has a browser map and no saved row, the system MUST save that map once and then use the stored row.

#### Scenario: Allowed keys save

- **WHEN** the user PUTs a valid map for `columns.roster.units`
- **THEN** a later GET returns that map under the same key

#### Scenario: Always-on column cannot be hidden

- **WHEN** the user tries to hide Name (or the table’s member-name column)
- **THEN** that column stays visible
- **AND** the saved map does not record it as hidden

#### Scenario: Giving migrates browser storage once

- **WHEN** a user has Giving columns only in the browser and no saved row
- **THEN** the first load applies those columns
- **AND** they are written to the user’s saved map
- **AND** later loads use the saved map, not the browser copy
