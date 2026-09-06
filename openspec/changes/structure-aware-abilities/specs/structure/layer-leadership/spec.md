## Purpose

Defines how church structure templates and node leadership drive capabilities without hardcoding product features to names like Fellowship or Cell.

## ADDED Requirements

### Requirement: Churches define ordered layers with their own labels
A church structure template SHALL support an ordered list of layers. Each layer SHALL have a display label chosen for that church. Product behavior MUST NOT require the display label to equal “Fellowship”, “PFCC”, or “Cell”.

#### Scenario: Church without “Fellowship” naming
- **WHEN** a church configures mid-layers labeled e.g. “Zone” and “District” with a leaf layer labeled “Home group”
- **THEN** the template is valid
- **AND** leaders assigned to those units receive abilities from layer leadership profiles, not from matching the string “FellowshipLeader”

### Requirement: Leadership is node-scoped
Structure leadership SHALL be expressed as an assignment of an auth user (or member-linked user) as leader of a structure node. Capabilities for that assignment SHALL derive from the **leadership profile of that node’s layer**, plus any church-wide manager roles (pastor / church admin).

#### Scenario: Mid-layer leader gets mid-layer profile abilities
- **WHEN** a user is assigned leader of a node on a mid-layer
- **THEN** they receive the abilities defined for that layer’s leadership profile (within that node’s subtree scope)

### Requirement: Default layer leadership profiles
The system SHALL provide default leadership profiles keyed by layer role in the template (e.g. church-wide manager, intermediate unit leader, leaf unit leader) covering at least: viewing scoped member givings, logging giving where allowed, and approval rights appropriate to that tier. Existing Pastor / ChurchAdmin / PFCC / Fellowship / Cell assignments SHALL migrate onto these profiles without loss of access they already have.

#### Scenario: Migrated cell leader keeps member givings access
- **WHEN** an existing CellLeader role assignment is migrated
- **THEN** the actor still has `viewMemberGivings` (or equivalent) for their cell subtree

### Requirement: Layer kind vs label
If the system retains internal layer kinds for defaults (e.g. leaf vs intermediate), those kinds SHALL be configuration metadata — not user-facing permission checks. UI permission checks SHALL use abilities only.

#### Scenario: Renamed leaf layer still acts as leaf
- **WHEN** the leaf layer display name is changed from “Cell” to “Home group”
- **THEN** leaf leaders still receive the leaf leadership profile abilities
- **AND** no client code must be updated for the new label
