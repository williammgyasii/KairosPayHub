## ADDED Requirements

### Requirement: Batch contribution create
The system SHALL accept a batch create request that logs multiple member contributions for one program with a shared batch id in a single operation.

#### Scenario: Successful batch create
- **WHEN** an authorized leader submits a batch of two or more valid contribution lines for an open approved program
- **THEN** each line is stored as a pending contribution sharing the same `batchId`
- **AND** the response includes all created contributions

#### Scenario: One pending notification for a batch
- **WHEN** a batch create succeeds
- **THEN** approvers receive exactly one pending-approval notification for that batch
- **AND** the notification body identifies it as a batch (member count and total amount)

#### Scenario: Single create still notifies once
- **WHEN** a single contribution is created without a batch
- **THEN** approvers receive exactly one pending-approval notification for that contribution

### Requirement: Activity surfaces treat batches as one unit
Recent activity SHALL display one row per batch (not one row per member contribution in the batch).

#### Scenario: Recent activity batch row
- **WHEN** three contributions share a `batchId`
- **THEN** recent activity shows a single batch row with member count and total amount
