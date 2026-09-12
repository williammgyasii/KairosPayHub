## Purpose

Lets a church require a written-and-photo report on some meeting types, with prompts that differ per type, and blocks submit until that report is complete.

## ADDED Requirements

### Requirement: Meeting type can require a report with its own schema

A church manager SHALL be able to turn “requires report” on or off when creating or editing a meeting type. When the toggle is turned on and the type has no schema yet, the system MUST seed a default schema: required long text “What was taught”, required long text “What was shared”, optional long text “Prayer / follow-up”, and required photos. The manager MUST be able to add, remove, rename, reorder, and mark required on prompts. v1 prompt kinds MUST be long text and photos only. Existing meeting types that never had the toggle set MUST NOT require a report.

#### Scenario: New type with report on gets the default schema

- **WHEN** a church manager creates a meeting type and turns requires-report on without editing prompts
- **THEN** the stored schema is the default four prompts (taught, shared, optional prayer, required photos)

#### Scenario: Sunday and Cell can disagree

- **WHEN** a church has two meeting types and the manager edits each schema differently
- **THEN** each type keeps its own prompts
- **AND** a type with requires-report off has no report step on Mark attendance

#### Scenario: Existing types stay off

- **WHEN** a meeting type created before this change is listed
- **THEN** it does not require a report
- **AND** leaders submit roll call as they do today

### Requirement: Submit is blocked until a required report is complete

When the selected meeting type requires a report, Mark attendance SHALL show a report step after the roll-call sheet. The report step MUST render that type’s schema (not a hardcoded Sunday or Cell form). Submit MUST stay unavailable until every required prompt has an answer. A required photos prompt MUST have at least one uploaded image. Save draft MUST remain available without a complete report. A meeting type that does not require a report MUST NOT show the report step.

#### Scenario: Incomplete report cannot be submitted

- **WHEN** a leader has marked every member present or absent on a report-required type
- **AND** a required text prompt is empty or a required photos prompt has no image
- **THEN** Submit is not accepted
- **AND** Save draft still succeeds

#### Scenario: Complete report can be submitted

- **WHEN** a leader fills every required prompt (including at least one photo on a required photos prompt)
- **THEN** they can submit the scope sheet
- **AND** the submission stores the answers against the schema

#### Scenario: No-report type is unchanged

- **WHEN** a leader marks attendance on a type that does not require a report
- **THEN** they go from the sheet to Submit with no report step

### Requirement: Approvers can read the report with the roll

When a submitted scope sheet includes a report, the approval (and submission detail) surface SHALL show each prompt’s label, the text answers, and the photos on a Report pane, separate from the roll-call pane (members, invitees, guest-risk). A sheet with no report MUST NOT show a Report pane or an empty report section as if one was required.

#### Scenario: Approver sees evidence

- **WHEN** a parent leader or church manager opens an approval that has a completed report
- **THEN** they can open a Report pane and see the prompt labels, written answers, and photos
- **AND** they can open a Roll call pane and still see the existing roll and guest-risk information

#### Scenario: No-report approval has no Report pane

- **WHEN** a parent leader opens an approval whose sheet has no report
- **THEN** they see only the Roll call pane
- **AND** they MUST NOT see an empty Report pane

### Requirement: Pending-approval copy names the submitter and the kind of sheet

When a scope sheet is submitted, the `AttendancePendingApproval` notification SHALL name the submitter, their leadership role, the unit, the meeting type, and whether the sheet includes a meeting report or only a roll call. Recipients stay the next approval hop. Copy MUST NOT hardcode a meeting title or structure layer.

#### Scenario: Roll call without a report

- **WHEN** a leader submits a sheet on a type that does not require a report
- **THEN** the next approver’s notification says that leader submitted that unit’s roll call for that meeting

#### Scenario: Roll call with a meeting report

- **WHEN** a leader submits a complete report with the roll call
- **THEN** the next approver’s notification says that leader submitted that unit’s meeting report for that meeting

#### Scenario: Reopened sheet can finish the report

- **WHEN** a rejected or reopened sheet is editable again on a report-required type
- **THEN** the leader can edit the report
- **AND** Submit remains blocked until the required prompts are complete again
