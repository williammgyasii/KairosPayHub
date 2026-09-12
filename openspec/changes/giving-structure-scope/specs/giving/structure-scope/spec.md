## Purpose

Lets churches attach giving campaigns to units that actually exist on their structure template, and derive create / log / approve rights from leadership on that template instead of hardcoded PFCC and Fellowship names.

## ADDED Requirements

### Requirement: Scope options follow the church template

Campaign and sub-campaign scope choices SHALL come from the church structure template and the actor’s leadership. Labels SHALL use each layer’s `displayName`. The system MUST NOT offer a layer the template does not define.

#### Scenario: No PFCC chip when the template has none

- **WHEN** the church template is Fellowship → Cell
- **AND** an authorized actor opens create campaign or add sub-campaign
- **THEN** scope choices include church-wide (if that actor may choose it) and the Fellowship and Cell layers
- **AND** there is no PFCC (or other missing-layer) choice

#### Scenario: Deepest layer is a valid scope

- **WHEN** the church template includes a deepest org layer (for example Cell)
- **AND** an authorized actor chooses that layer
- **THEN** they can attach the campaign to a unit on that layer

### Requirement: Scope is stored as church-wide or unit nodes

Creating a campaign or sub-campaign SHALL persist either church-wide scope or one or more structure node ids. Multi-select MUST be units on the same layer. The client MUST NOT be required to send `PFCC` or `Fellowship` as the source of truth.

#### Scenario: Single unit on a no-PFCC church

- **WHEN** a church has no PFCC layer
- **AND** an authorized actor creates a campaign scoped to one existing fellowship unit
- **THEN** the program is stored against that node
- **AND** a later read returns that node as the scope

#### Scenario: Multi-select must share a layer

- **WHEN** an actor selects two units on different layers
- **THEN** the system rejects the create

### Requirement: Child scope stays inside the parent

A sub-campaign’s scope MUST be the parent’s scope or a subtree of it. A child MUST NOT be wider than its parent.

#### Scenario: Sub-campaign under a fellowship parent

- **WHEN** the parent campaign is scoped to Fellowship A
- **AND** an actor tries to create a sub-campaign scoped to Fellowship B
- **THEN** the system rejects the create

#### Scenario: Cell under the same fellowship is allowed

- **WHEN** the parent campaign is scoped to Fellowship A
- **AND** an actor creates a sub-campaign scoped to a cell that belongs to Fellowship A
- **THEN** the sub-campaign is created

### Requirement: Create, bulk-log, and approve follow leadership

Who may create a campaign or sub-campaign, who may bulk-log, and who approves a pending contribution SHALL follow the actor’s leadership profile and the layers that exist on the church. Screens and API checks MUST NOT gate those actions on `role === 'FellowshipLeader'` or `role === 'PFCCManager'` string compares.

#### Scenario: Intermediate leader creates a sub-campaign

- **WHEN** the actor’s leadership is intermediate (for example a fellowship leader)
- **AND** they add a sub-campaign under a parent whose scope contains their unit
- **THEN** the create succeeds
- **AND** the new scope is inside that parent

#### Scenario: Leaf leader cannot create campaigns

- **WHEN** the actor’s leadership is leaf (for example a cell leader)
- **THEN** they cannot create a main campaign or a sub-campaign

#### Scenario: Approval skips a layer the church does not have

- **WHEN** a cell leader logs a contribution
- **AND** the church has Fellowship leaders but no PFCC managers
- **THEN** the next approver is the fellowship (intermediate) leadership, then church-wide
- **AND** the hop does not require a PFCC manager

#### Scenario: Approval goes to pastor when there is no Fellowship layer

- **WHEN** the church template is Church → Cell (no Fellowship or PFCC)
- **AND** a cell leader logs a contribution
- **THEN** the next approver is the pastor (church-wide)
- **AND** the pastor can approve that contribution
- **AND** church-wide leadership is not offered Log giving on the program

#### Scenario: Bulk log is for intermediate leadership

- **WHEN** the actor’s leadership is intermediate
- **THEN** they may bulk-log contributions
- **WHEN** the actor’s leadership is leaf
- **THEN** they may log a single member only
- **WHEN** the actor’s leadership is church-wide
- **THEN** they may not log contributions

#### Scenario: Log giving chooses single or batch from a menu

- **WHEN** a leader who can log giving taps Log giving
- **THEN** a menu offers Single giving and Batch giving
- **AND** choosing one opens the log wizard already in that mode
- **AND** the wizard does not ask them to pick the mode again

### Requirement: Create and sub-campaign forms are single-page

Create campaign and add sub-campaign SHALL present details, schedule, and scope on one form with a short summary. Add sub-campaign MUST NOT require a separate Mode, Schedule, Scope, and Review stepper.

#### Scenario: Add sub-campaign has no four-step stepper

- **WHEN** an actor opens add sub-campaign
- **THEN** mode, dates, and scope are on one form
- **AND** they can submit without paging through four wizard steps

### Requirement: Existing scoped programs keep working

Programs already stored as church-wide, PFCC, fellowship, or fellowship-group SHALL remain readable and usable. Members already in those programs’ scopes MUST still match.

#### Scenario: Legacy fellowship-group program still matches members

- **WHEN** a program was stored as a fellowship group with multiple node ids
- **AND** a member sits under one of those fellowships
- **THEN** that member remains in the program’s scope
