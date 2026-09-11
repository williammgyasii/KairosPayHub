## Purpose

Defines the occurrence metrics detail experience: a compact summary strip and tabbed views for the present roster versus structure/unit rollups.

## ADDED Requirements

### Requirement: Compact summary strip
For a selected meeting type and occurrence, metrics detail SHALL show a chip strip of Present (total), Guests, and First timers. Pending MAY appear when its count is greater than zero. Absent SHALL NOT appear on the strip. Meeting/date context lives in the page header. Approved-unit counts stay on Attendance by units.

#### Scenario: Adaptive chips
- **WHEN** a viewer opens metrics for a Sunday service occurrence
- **THEN** the summary strip shows Present, Guests, and First timers
- **AND** does not show Absent
- **AND** Pending appears only when its count is greater than zero
- **AND** does not show Approved units on that strip

### Requirement: Tabbed metrics detail
Occurrence metrics detail SHALL present tabs **All attendance** and **Attendance by units**. The page SHALL NOT stack both a full unit-status table and a full people table as separate always-visible sections.

#### Scenario: Switch tabs
- **WHEN** the viewer is on All attendance
- **THEN** they see the present-people roster for the occurrence
- **WHEN** they switch to Attendance by units
- **THEN** they see a structure metrics breakdown for that occurrence
- **AND** they no longer see both full tables at once

### Requirement: All attendance roster
All attendance SHALL list people marked present in a dedicated TanStack table (server-side sort, filter, and pagination). Search, type, unit filter, and column toggles SHALL sit outside that table, not inside its frame.

#### Scenario: Roster columns and filters
- **WHEN** the viewer opens All attendance for an occurrence with present people
- **THEN** they see name, unit, type, phone, and invited by in a table region of its own
- **AND** search and filters sit above that table, not inside it
- **AND** they can show or hide optional columns such as parent unit via switches

### Requirement: Attendance by units breakdown
Attendance by units SHALL show submission-unit attendance metrics (at least present, members, first-timers, guests) with approval status. When parent units exist, rows SHALL nest under the parent (e.g. fellowship → cells) using structure layer display names (not a generic “Parent” label). Parent rows SHALL show aggregated counts of their child submission units.

#### Scenario: Pastor sees fellowship then cells with counts
- **WHEN** a pastor opens Attendance by units for a cell-start meeting under fellowships
- **THEN** they see each fellowship with aggregated present/member/first-timer/guest totals
- **AND** under each fellowship, each cell with its own counts and status
- **AND** column headers / group labels use the structure layer name (e.g. Fellowship), not “Parent”

### Requirement: Yet to submit tab
Yet to submit SHALL list submission units whose roll call is still Draft (not yet submitted for approval), so managers can see who has not sent attendance.

#### Scenario: Draft units listed
- **WHEN** some cells have Draft sheets and others are Pending or Approved
- **THEN** Yet to submit lists only the Draft units
