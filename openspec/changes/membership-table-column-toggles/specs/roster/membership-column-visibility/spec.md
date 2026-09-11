## ADDED Requirements

### Requirement: Membership table column visibility

The membership members table SHALL let the user show or hide columns for stored member profile fields and structure layers without changing which members are listed.

#### Scenario: Default visible columns

- **WHEN** a user opens the membership members table
- **THEN** Name is visible
- **AND** Email, Phone, Role, Responsiveness, and each structure layer column are visible by default
- **AND** Age, Date of birth, Residence, State, Occupation, School / work, and Workplace are hidden by default

#### Scenario: Toggle shows a hidden profile column

- **WHEN** the user opens Columns and turns on State
- **THEN** the State column appears in the table header and cells for members that have state data

#### Scenario: Toggle hides a default column

- **WHEN** the user turns off Email in Columns
- **THEN** the Email column is not shown in the table

#### Scenario: Name cannot be hidden

- **WHEN** the user opens the Columns menu
- **THEN** Name is listed as always on and cannot be turned off
