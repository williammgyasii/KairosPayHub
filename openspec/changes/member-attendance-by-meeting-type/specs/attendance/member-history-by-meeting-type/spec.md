## Purpose

Lets authorized actors view a member’s attendance scoped by meeting type, with per-type summary counts.

## ADDED Requirements

### Requirement: Member attendance history is filterable by meeting type

The member attendance history API SHALL accept an optional `meetingTypeId` query parameter. When provided, returned items and the page summary SHALL include only entries for that meeting type. When omitted, items MAY include all meeting types and the summary SHALL reflect overall recorded Present/Absent counts.

#### Scenario: Filter returns only the selected meeting type

- **WHEN** a member has Present on Sunday Service and Absent on Midweek Service
- **AND** an authorized actor requests history with `meetingTypeId` set to Midweek Service
- **THEN** items include only Midweek rows
- **AND** summary present/absent/recorded counts reflect Midweek only

### Requirement: Response includes per-meeting-type summaries

The history response SHALL include a `meetingTypes` list covering the church’s active meeting types for that member, each with `meetingTypeId`, `title`, `presentCount`, `absentCount`, and `recordedCount` (zeros allowed).

#### Scenario: Meeting type list includes zeros

- **WHEN** a member has records only for Sunday Service
- **AND** the church also has Midweek Service active
- **THEN** `meetingTypes` includes Midweek with recordedCount 0
- **AND** includes Sunday with recordedCount greater than 0

### Requirement: Member attendance page scopes UI by meeting type

The member attendance page SHALL let the actor select a meeting type and SHALL show summary metrics and history for the selected type.

#### Scenario: Switching meeting type updates the view

- **WHEN** an actor opens a member attendance page with multiple meeting types
- **AND** selects a different meeting type
- **THEN** the visible summary and rows reflect that meeting type
