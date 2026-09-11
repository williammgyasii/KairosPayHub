## Purpose

Lets a user show or hide optional columns on the Roster Units table without changing which units are listed.

## ADDED Requirements

### Requirement: Units table column visibility

The Roster Units table SHALL offer a Columns control like Membership. Name MUST stay visible and MUST NOT be turn-offable. Parent and Members SHALL be toggleable and visible by default. Toggling MUST NOT change which unit rows are listed. The same visibility SHALL apply across layer tabs for that user.

#### Scenario: Default visible columns

- **WHEN** a user opens Roster → Units with no saved units map
- **THEN** Name, Parent, and Members are visible
- **AND** Name is listed as always on

#### Scenario: Toggle hides Parent

- **WHEN** the user turns off Parent in Columns
- **THEN** the Parent column is not shown
- **AND** the unit rows stay the same

#### Scenario: Toggle shows Parent again

- **WHEN** Parent is hidden and the user turns it on
- **THEN** the Parent column appears with each unit’s parent name
