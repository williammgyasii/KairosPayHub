## Purpose

Defines how meeting types choose a structure-template layer for roll-call submission units, who may submit and approve, and how dual-hatted leaders pick a scope.

## ADDED Requirements

### Requirement: Meeting type declares submission start layer
When creating or editing a meeting type, a church manager SHALL choose **Submissions start at** from the layers defined on that church’s structure template (using each layer’s display name). The chosen layer SHALL determine which structure nodes receive roll-call sheets for occurrences of that meeting type.

#### Scenario: Pastor picks Cell layer
- **WHEN** the church template includes a layer displayed as “Cell” (or equivalent)
- **AND** the pastor creates “Sunday Service” with Submissions start at that layer
- **THEN** the meeting type stores that layer as the submission start
- **AND** occurrences generate one roll-call sheet per in-scope node on that layer

#### Scenario: Church without cells picks Fellowship
- **WHEN** the church template’s deepest or relevant layer is Fellowship (no Cell layer)
- **AND** the pastor sets Submissions start at Fellowship
- **THEN** roll-call sheets are created for Fellowship nodes
- **AND** Fellowship leaders of those nodes MAY submit roll call for their unit

#### Scenario: Layer options come from template
- **WHEN** the pastor opens the meeting-type form
- **THEN** Submissions start at lists only layers from the church’s current structure template
- **AND** does not hard-code only “Cell”

### Requirement: Leaders of submission-layer nodes submit
An actor assigned as leader of a structure node on the meeting type’s submission-start layer SHALL be able to mark and submit roll call for that node’s sheet (subject to the meeting window / always-open rules). Actors without such an assignment SHALL NOT submit that sheet.

#### Scenario: Cell leader submits cell sheet
- **WHEN** submission start is the Cell layer
- **AND** a user is leader of Cell A
- **THEN** they MAY submit roll call for Cell A’s occurrence sheet
- **AND** they SHALL NOT submit for Cell B unless also assigned there

#### Scenario: Pastor without unit leadership does not submit
- **WHEN** a church manager (pastor/admin) has no roll-call scope assignment on a submission-layer unit
- **THEN** they SHALL NOT see Attendance → Mark attendance as a submitter surface
- **AND** they SHALL NOT use a pastor demo path to mark/submit another unit’s roll call
- **AND** they MAY still use Meeting types and Metrics
- **AND** they SHALL NOT see Attendance → Approvals

### Requirement: One-hop parent approval for attendance
After a leaf (submission-unit) roll call is submitted, the system SHALL route approval to the **immediate parent** structure leader above that unit (when such a parent unit and leader exist). Church managers (pastor/admin) SHALL NOT approve attendance and SHALL NOT appear in the attendance approval queue. Giving approval rules are unchanged by this requirement.

#### Scenario: Cell submits, fellowship leader approves
- **WHEN** a Cell sheet is submitted and the cell’s parent is a Fellowship with a leader
- **THEN** that Fellowship leader sees the item in their attendance approval queue
- **AND** the pastor is not required to approve for the roll call to become approved for metrics

#### Scenario: Pastor cannot approve when parent has no leader
- **WHEN** a Cell sheet is submitted and the parent Fellowship has no assigned leader
- **THEN** the pastor’s attendance approval queue stays empty
- **AND** a pastor attempt to approve that sheet is forbidden
- **AND** the submission remains pending until a parent-unit leader is assigned and approves

#### Scenario: Fellowship is submission layer under church
- **WHEN** submission start is Fellowship and the parent is church-level with no intermediate structure leader
- **THEN** no church-manager override approves that sheet
- **AND** approval waits for an assigned leader on the immediate parent node when one exists

### Requirement: Dual-hatted leader chooses scope
When an actor leads more than one in-scope submission unit (including units on different layers when relevant to available sheets), the UI SHALL let them choose which unit they are logging attendance for before marking the sheet.

#### Scenario: Fellowship and cell leader
- **WHEN** a user leads Fellowship X and Cell Y under X
- **AND** both have sheets for the selected occurrence (or only cell sheets exist for a cell-start meeting)
- **THEN** they can select the unit to log for and only edit that unit’s sheet
