## Purpose

Defines meeting-type submission windows: always-open mode, smart open/deadline relative to the meeting weekday, clear selects/time inputs, and help tooltips. Times are interpreted in the church’s timezone.

## ADDED Requirements

### Requirement: Always-open meeting types
A church manager creating or editing a meeting type SHALL be able to mark it **Always open**. When Always open is enabled, scoped leaders MAY submit roll call for the current occurrence at any time (no submission open/deadline gate). The UI SHALL explain Always open via a help control (“?”).

#### Scenario: Pastor enables always open
- **WHEN** a pastor creates a meeting type named “Cell meeting” with Always open enabled
- **THEN** the meeting type is saved as always open
- **AND** a cell leader may submit roll call without waiting for a scheduled open time

#### Scenario: Always open hides finite window fields
- **WHEN** Always open is enabled on the form
- **THEN** submission opens and deadline controls are not required (hidden or disabled)
- **AND** a short explanation remains visible via the help control

### Requirement: Weekly meetings keep name and frequency
Creating a weekly meeting type SHALL require a name and a frequency weekday. Frequency remains the meeting day of week.

#### Scenario: Name and Saturday frequency
- **WHEN** a pastor creates a meeting type with name “Some meetings” and frequency Saturday
- **THEN** the meeting type is stored with that title and Saturday as the meeting day

### Requirement: Smart submission opens relative to meeting day
For weekly (non–always-open) meeting types, **Submission opens** SHALL offer select options limited to:
- **Same day as the meeting**
- **Next day after the meeting**

Options SHALL be labeled using the concrete weekdays implied by the chosen frequency (e.g. frequency Saturday → “Saturday (same day)” / “Sunday (next day)”). Generic “2 days after” / “3 days after” SHALL NOT be offered for weekly meeting types.

#### Scenario: Saturday meeting open choices
- **WHEN** frequency is Saturday and Always open is off
- **THEN** submission opens choices are Saturday (same day) and Sunday (next day) only

#### Scenario: Default open is same-day evening
- **WHEN** the pastor opens the create form for a Saturday meeting with default settings
- **THEN** submission opens defaults to same day with an evening local time (configurable default such as 21:00 church time)
- **AND** the pastor can change the open day option and time

### Requirement: Deadline closes the window
For weekly (non–always-open) meeting types, a **Deadline** SHALL define when submissions stop. Anytime from the open instant until the deadline (inclusive of product rules already used for open ≤ now ≤ deadline) SHALL allow submission. Deadline SHALL use a day-relative select (at least same day and next day, labeled with weekdays) plus a local time.

#### Scenario: Deadline noon next day
- **WHEN** frequency is Saturday, opens Saturday 21:00 church time, and deadline is Sunday 12:00 church time
- **THEN** roll call is allowed after Saturday 21:00 and not after Sunday 12:00 (church local)

### Requirement: Clear select and time inputs
Open day and deadline day SHALL use select controls; open time and deadline time SHALL use time inputs. Values are edited and displayed in the church timezone (not a hard-coded “GMT Ghana” label).

#### Scenario: Form shows church timezone
- **WHEN** the church timezone is `Africa/Accra`
- **THEN** the meeting type form indicates times are in that timezone (or a clear Accra/GMT label derived from it)

### Requirement: Help tooltips
The meeting type form SHALL provide “?” help for Always open, Submission opens, and Deadline explaining what each control does in plain language.

#### Scenario: Pastor opens help on deadline
- **WHEN** the pastor activates the Deadline help control
- **THEN** they see an explanation that the deadline is when roll call submissions stop for that meeting occurrence
