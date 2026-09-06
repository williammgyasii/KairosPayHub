## Purpose

Defines the occurrence metrics detail experience: a compact summary strip and tabbed views for the present roster versus structure/unit rollups.

## ADDED Requirements

### Requirement: Compact summary strip
For a selected meeting type and occurrence, metrics detail SHALL show at most four summary tiles: total present, members present, first-timers present, and pending approval count. Meeting/date context MAY share the same band. Guests and approved-unit counts MAY be omitted from the strip (reachable via filters or the By unit tab).

#### Scenario: Four tiles only
- **WHEN** a viewer opens metrics for a Sunday service occurrence
- **THEN** the summary strip shows Present, Members, First-timers, and Pending
- **AND** does not show Guests or Approved units as separate tiles on that strip

### Requirement: Tabbed metrics detail
Occurrence metrics detail SHALL present three tabs: **Who showed up**, **By unit**, and **Yet to submit**. The page SHALL NOT stack both a full unit-status table and a full people table as separate always-visible sections.

#### Scenario: Switch tabs
- **WHEN** the viewer is on Who showed up
- **THEN** they see the present-people roster for the occurrence
- **WHEN** they switch to By unit
- **THEN** they see a structure metrics breakdown for that occurrence
- **WHEN** they switch to Yet to submit
- **THEN** they see submission units that have not yet submitted roll call
- **AND** they no longer see all three full tables at once

### Requirement: Who showed up roster
Who showed up SHALL list people marked present with columns for name, unit, type, phone, and invited by. Filtering, sorting, and pagination SHALL be applied server-side via the occurrence rollup API. The viewer SHALL be able to toggle optional columns with switch controls (including parent unit / fellowship when the API provides it).

#### Scenario: Roster columns and filters
- **WHEN** the viewer opens Who showed up for an occurrence with present people
- **THEN** they see name, unit, type, phone, and invited by
- **AND** they can filter by type and search
- **AND** they can show or hide optional columns such as parent unit via switches

### Requirement: By unit metrics breakdown
By unit SHALL show submission-unit attendance metrics (at least present, members, first-timers, guests) with approval status. When parent units exist, rows SHALL nest under the parent (e.g. fellowship → cells) using structure layer display names (not a generic “Parent” label). Parent rows SHALL show aggregated counts of their child submission units.

#### Scenario: Pastor sees fellowship then cells with counts
- **WHEN** a pastor opens By unit for a cell-start meeting under fellowships
- **THEN** they see each fellowship with aggregated present/member/first-timer/guest totals
- **AND** under each fellowship, each cell with its own counts and status
- **AND** column headers / group labels use the structure layer name (e.g. Fellowship), not “Parent”

### Requirement: Yet to submit tab
Yet to submit SHALL list submission units whose roll call is still Draft (not yet submitted for approval), so managers can see who has not sent attendance.

#### Scenario: Draft units listed
- **WHEN** some cells have Draft sheets and others are Pending or Approved
- **THEN** Yet to submit lists only the Draft units
