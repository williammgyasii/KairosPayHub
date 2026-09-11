## Purpose

Scores submitted unit roll calls for guest-padding risk and shows a warning to parent approvers without blocking Add invitee or Approve.

## ADDED Requirements

### Requirement: Add invitee stays unrestricted
A unit leader SHALL be able to add an invitee with any name, including a name that already exists on that unit’s invitee list. The system SHALL NOT reject Add invitee solely because the name or phone matches an existing invitee or member.

#### Scenario: Two guests named Ama
- **WHEN** a unit leader adds an invitee named Ama
- **AND** another Ama is already on that unit’s invitee list
- **THEN** the add succeeds
- **AND** both rows remain distinct people

### Requirement: Submit stores a guest-risk score
When a unit leader submits a roll-call sheet, the system SHALL compute a guest-risk result of `clear`, `watch`, or `flagged` plus one or more human-readable reasons when the result is not `clear`. The result SHALL be stored on that unit’s submission for that occurrence.

#### Scenario: Padded guests vs members
- **WHEN** the submitted sheet has many present invitees relative to present members (per the published score rules)
- **THEN** the stored result is `watch` or `flagged`
- **AND** a reason names the guest-to-member imbalance

#### Scenario: Ordinary sheet
- **WHEN** the submitted sheet has no triggered risk signals
- **THEN** the stored result is `clear`
- **AND** no warning reasons are required

### Requirement: Approvals show a warning only
Parent leaders viewing Attendance → Approvals SHALL see the stored guest-risk warning on the queue row and on the review detail when the result is `watch` or `flagged`. They SHALL still be able to approve or reject that sheet. The warning SHALL include the reasons. A `clear` result SHALL NOT show a risk warning.

#### Scenario: Fellowship leader sees flag and can still approve
- **WHEN** a parent leader opens Approvals
- **AND** a pending sheet is `flagged` (or `watch`)
- **THEN** they see a warning with the stored reasons
- **AND** Approve remains available
- **AND** they can complete approval without dismissing a lock

#### Scenario: Clear sheet has no risk banner
- **WHEN** a pending sheet is `clear`
- **THEN** the queue and detail do not show a guest-risk warning
