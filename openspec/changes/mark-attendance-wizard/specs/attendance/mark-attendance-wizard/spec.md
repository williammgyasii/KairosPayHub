## Purpose

Defines the Mark attendance two-step wizard, member marking affordances, invitee/first-timer consolidation, and metrics remaining read-only.

## ADDED Requirements

### Requirement: Two-step Mark attendance wizard
Mark attendance SHALL present step 1 to choose meeting type and service date, then step 2 to mark the sheet (members and invitees) and save/submit. Actors SHALL be able to return from step 2 to step 1 to change meeting or date.

#### Scenario: Leader picks then marks
- **WHEN** a unit leader opens Mark attendance
- **THEN** they first choose a meeting type and a selectable service date
- **AND** after continuing, they see the roll-call sheet for that occurrence
- **AND** they can go back (labeled Go back) to change meeting or date without losing the route home

#### Scenario: Submit returns to pick step with submissions list
- **WHEN** a unit leader submits roll call for approval
- **THEN** they return to step 1 (pick meeting/date)
- **AND** step 1 shows a Your submissions table including the submitted row with Pending approval (or Approved when already approved)

### Requirement: Upcoming locked occurrence near header
When the next future occurrence is locked, Mark attendance SHALL surface that upcoming date and why it is locked near the page header (same band as the title), without blocking step 1 for past/today dates.

#### Scenario: Next Saturday locked
- **WHEN** today’s sheet is available and next week’s occurrence exists but is future
- **THEN** the UI indicates the upcoming locked service (date + short reason)
- **AND** the leader can still select today’s (or past) date in step 1

### Requirement: Compact save and submit actions
Step 2 SHALL offer Save draft and Submit for approval as compact, lightly rounded buttons with icons. Busy work SHALL show spinners on those buttons (or Add invitee), not a full-page blocking loading modal for save/submit.

#### Scenario: Submit shows button spinner
- **WHEN** the leader submits roll call
- **THEN** the Submit button shows an in-button busy state
- **AND** no full-page loading modal replaces the sheet solely for that request

### Requirement: Click present, double-click absent
On the members grid, a single click SHALL mark Present and a double-click SHALL mark Absent. The UI SHALL include a short hint explaining this.

#### Scenario: Leader marks members
- **WHEN** the leader single-clicks an unmarked member
- **THEN** the member is Present
- **WHEN** the leader double-clicks a member
- **THEN** the member is Absent

### Requirement: Invitees absorb first timers
Mark attendance SHALL NOT use a separate First timers tab. First-timer status SHALL be captured on the invitee (add form and list). Approval review SHALL likewise not require a separate First timers tab.

#### Scenario: Add invitee as first timer
- **WHEN** the leader adds an invitee and marks them as a first timer
- **THEN** the invitee appears on the Invitees tab with first-timer indicated
- **AND** there is no separate First timers tab to switch to

### Requirement: Metrics is read-only for marking
Attendance metrics SHALL NOT offer a Mark attendance call-to-action. Marking remains under Mark attendance navigation only.

#### Scenario: Fellowship leader on metrics
- **WHEN** a fellowship leader opens Metrics for a meeting type and date
- **THEN** they see tiles/tables for that occurrence
- **AND** they do not see a Mark attendance button on that page
