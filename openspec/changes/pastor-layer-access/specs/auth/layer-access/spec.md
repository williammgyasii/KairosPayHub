## Purpose

Lets a pastor set product abilities for each structure layer and for church administrators. Session and APIs apply those overlays on top of default leadership profiles, still scoped to each actor’s subtree.

## ADDED Requirements

### Requirement: Access grid is layer and administrator overlays

A pastor SHALL be able to view and save product-ability overlays for:

1. Each structure template layer (row label is that layer’s display name)
2. An Administrators profile that applies to every ChurchAdmin by default
3. Each named church administrator, which MAY only turn abilities off relative to the Administrators profile

Defaults SHALL come from the existing leadership profiles (church-wide, intermediate, leaf). Unsaved or unset cells SHALL keep the default. The grid MUST NOT use layer type names such as Fellowship or Cell as permission keys. Pastor abilities MUST NOT appear as an editable row.

The editable abilities SHALL include at least: create child units (Units), manage roster (Roster), and the Records set: view member givings, log giving, approve giving, view overall givings, create campaign, and create sub-campaign. Roster SHALL be one ability, not add-vs-manage. `manageChurch` and template-level `manageStructure` SHALL NOT be grantable on layer or administrator rows. The Access editor SHALL present these under Units / Roster / Records headings; APIs SHALL keep checking the same ability ids.

#### Scenario: Pastor opens Access for a Fellowship then Cell church

- **WHEN** a pastor opens Access
- **THEN** the grid has a row for each template layer using that church’s display names
- **AND** it has an Administrators row
- **AND** it has a row for each active church administrator
- **AND** intermediate-layer create-child-units is on by default
- **AND** the deepest layer’s create-child-units cell is off and not editable

#### Scenario: Pastor turns off create-child-units for a mid layer

- **WHEN** the pastor saves create-child-units off for a mid-layer
- **THEN** leaders of units on that layer no longer receive create-child-units
- **AND** leaders on other layers keep their current values

#### Scenario: Relabeled layer still uses the same overlay

- **WHEN** a church’s deepest layer display name is Home group
- **THEN** Access shows Home group as the row label
- **AND** overlays for that layer still apply to its leaders

### Requirement: Pastor can limit administrators

The Administrators profile SHALL be able to turn off any editable ability for all ChurchAdmin actors. A named administrator overlay SHALL apply after the Administrators profile and MUST NOT turn an ability back on. A ChurchAdmin MUST NOT edit Access or restore an ability the pastor turned off. Pastor session abilities MUST ignore these overlays.

#### Scenario: Pastor limits the administrator profile

- **WHEN** the pastor turns off view overall givings on the Administrators row and saves
- **THEN** every ChurchAdmin session no longer includes view overall givings
- **AND** the pastor session still includes it

#### Scenario: Pastor limits one administrator further

- **WHEN** the Administrators profile still has manage roster
- **AND** the pastor turns manage roster off for administrator Jane and saves
- **THEN** Jane’s session does not include manage roster
- **AND** other administrators still have manage roster

#### Scenario: Named administrator cannot exceed the profile

- **WHEN** the pastor has turned approve giving off on the Administrators row
- **AND** a save attempts to turn approve giving on for a named administrator
- **THEN** the save is rejected
- **AND** that administrator still lacks approve giving

#### Scenario: Administrator cannot raise their own access

- **WHEN** a ChurchAdmin calls the Access save API or opens Access
- **THEN** the request is rejected or the page is not available
- **AND** their abilities stay as the pastor last saved

### Requirement: Session and APIs honor overlays

An onboarded actor’s session profile SHALL list abilities after defaults plus church overlays for their layer or administrator subject. Protected APIs MUST enforce the same resolution. Forged client abilities MUST NOT expand access. Scope MUST still limit reads and writes to the actor’s subtree (church-wide actors have the whole church).

#### Scenario: Mid-layer leader receives create-child-units

- **WHEN** create-child-units is on for that leader’s layer
- **THEN** their session includes create-child-units
- **AND** they do not receive create-child-units for units outside their scope

#### Scenario: Overlay off removes the ability

- **WHEN** the pastor has turned view member givings off for the leaf layer
- **THEN** a leaf leader’s session does not include view member givings
- **AND** member-givings APIs reject that actor

#### Scenario: Manage-roster overlay is enforced on write APIs

- **WHEN** the pastor has turned manage roster off for a layer
- **THEN** a leader on that layer cannot create, update, delete, or accept/decline members, or mint a join link, even if they call the API directly

### Requirement: Create-child-units means immediate child in scope

Create-child-units SHALL allow creating a unit only on the layer immediately below the actor’s scope node (or any layer, for a church-wide actor who still has the ability). The new unit’s parent MUST lie in the actor’s subtree. A leaf leader MUST NOT receive create-child-units. A church-wide actor without create-child-units MUST NOT create units.

#### Scenario: Fellowship leader adds a cell under their fellowship

- **WHEN** an intermediate leader has create-child-units
- **AND** they create a unit on the next layer down with a parent in their subtree
- **THEN** the unit is created

#### Scenario: Fellowship leader cannot add a sibling fellowship

- **WHEN** an intermediate leader has create-child-units
- **AND** they try to create a unit on their own layer
- **THEN** the request is rejected

#### Scenario: Fellowship leader cannot add a cell under another fellowship

- **WHEN** an intermediate leader has create-child-units
- **AND** they try to parent the new unit outside their subtree
- **THEN** the request is rejected
