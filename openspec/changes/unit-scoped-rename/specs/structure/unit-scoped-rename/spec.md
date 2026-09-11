## ADDED Requirements

### Requirement: Scoped unit rename

The system SHALL allow a unit leader to rename the structure node that is their role scope, and SHALL allow church managers to perform full unit updates.

#### Scenario: Cell leader renames own cell

- **WHEN** a CellLeader whose scope is Cell A PATCHes that node with a new name only
- **THEN** the cell name is updated
- **AND** leadership and unit number are unchanged

#### Scenario: Cell leader cannot change leadership via update

- **WHEN** a CellLeader PATCHes their scope node with a new leader or clearLeader
- **THEN** the request is rejected

#### Scenario: Cell leader cannot rename another cell

- **WHEN** a CellLeader whose scope is Cell A PATCHes Cell B
- **THEN** the request is forbidden

#### Scenario: Units menu offers Edit for own unit

- **WHEN** a unit leader opens the ⋯ menu on their own unit
- **THEN** they see Edit (layer display name) and can change the name only
- **AND** they do not see Change leadership or Delete from that limited edit path
