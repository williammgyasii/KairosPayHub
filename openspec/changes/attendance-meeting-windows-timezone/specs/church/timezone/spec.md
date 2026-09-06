## Purpose

Defines per-church timezone used for attendance meeting windows and related local-time displays, set from country at onboarding (alongside currency).

## ADDED Requirements

### Requirement: Church has a timezone
Each church SHALL store an IANA timezone identifier. Attendance meeting open/deadline times SHALL be interpreted in that timezone when computing occurrence windows and when showing times to actors.

#### Scenario: Accra church windows use Africa/Accra
- **WHEN** a church’s timezone is `Africa/Accra`
- **AND** a meeting type opens Saturday at 21:00
- **THEN** the occurrence submission open instant is Saturday 21:00 in Africa/Accra

#### Scenario: Occurrence “today” uses church timezone
- **WHEN** a church’s timezone is `America/Toronto`
- **AND** it is still Saturday evening in Toronto while UTC has rolled to Sunday
- **THEN** weekly occurrence generation treats “today” as that Saturday
- **AND** leaders may select that Saturday for roll call (Always open or after the window opens)

### Requirement: Timezone defaults from country at onboarding
When a pastor creates/onboards a church and selects a supported country, the system SHALL set a default timezone for that country (documented mapping). The actor SHOULD be able to confirm or change timezone during onboarding if multiple zones exist for that country; if only one default exists, it MAY be applied automatically and shown for confirmation.

#### Scenario: Ghana onboarding sets Africa/Accra
- **WHEN** the pastor selects Ghana during church onboarding
- **THEN** the church timezone defaults to `Africa/Accra` (or the mapped default for GH)
- **AND** currency continues to resolve as today for that country

#### Scenario: Country with a clear default
- **WHEN** the pastor selects a supported country that maps to one primary timezone
- **THEN** that timezone is stored on the church without requiring a separate free-text IANA entry
