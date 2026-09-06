## ADDED Requirements

### Requirement: Awaiting approval count on programs
Program list responses SHALL include a count of contributions awaiting the current actor’s approval for that program (including descendants when listing a parent).

#### Scenario: Approver sees awaiting count
- **WHEN** a fellowship leader has two pending contributions awaiting their approval on a campaign
- **THEN** that program’s list DTO includes `awaitingMyApprovalCount` of 2

#### Scenario: Enterer without approval duty sees zero
- **WHEN** a cell leader lists programs and has no contributions awaiting their approval
- **THEN** `awaitingMyApprovalCount` is 0

### Requirement: Campaign list surfaces awaiting work
The campaigns table SHALL show a clickable awaiting indicator when `awaitingMyApprovalCount` is greater than zero, linking to the campaign awaiting-approval tab.

#### Scenario: Click awaiting badge
- **WHEN** a campaign shows an awaiting count greater than zero
- **AND** the actor activates the indicator
- **THEN** they navigate to that campaign with the awaiting approval tab selected
