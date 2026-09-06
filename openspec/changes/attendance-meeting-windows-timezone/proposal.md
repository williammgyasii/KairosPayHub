## Why

Pastors configure weekly meeting types, but the create/edit form is hard to reason about: times are labeled as fixed GMT/Ghana, open/deadline offsets include options that don’t fit a Saturday meeting, and there is no “always open for roll call” mode. Churches in different countries need windows in their local timezone (alongside country/currency already collected at onboarding).

## What Changes

- Add an **Always open** option on meeting types so leaders can submit roll call any time (with a clear “?” explanation).
- Keep **name** and **frequency** (weekday); improve **submission opens** and **deadline** UX with smart selects (day relative to the meeting weekday) and time inputs in the **church timezone**.
- Constrain open-day choices to **same day** and **next day** relative to the meeting (remove generic “2–3 days after” for weekly meetings).
- Smart defaults: e.g. meeting Saturday → opens evening same day; deadline noon next day — still editable.
- Add **church timezone** (IANA) derived from country at church onboarding/signup (alongside currency); use it for meeting windows and UI labels.
- Help tooltips (“?”) on Always open, Submission opens, and Deadline.
- **Out of scope:** pastor UI to assign roles/users (later); CASL ability for “manage meeting types” beyond existing pastor/manager gates.

## Capabilities

### New Capabilities

- `attendance/meeting-windows`: always-open meetings; smart open/deadline relative to meeting day; tooltips; church-local times.
- `church/timezone`: persist and use church timezone from country/onboarding.

### Modified Capabilities

- (none archived under `openspec/specs/` yet)

## Impact

- API: `AttendanceMeetingType` (+ always-open flag), window calculator/generator, `Church` timezone field + onboarding/locale map, migrations.
- Frontend: meeting type form modal, attendance UI helpers, onboarding country → timezone, display of windows in church TZ.
- Tests: window math, always-open behavior, timezone default from country.
