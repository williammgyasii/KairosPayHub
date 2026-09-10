## Purpose

Lets pastors add org units on any template layer through one create-unit flow whose steps and labels come from the church structure, not from hardcoded Fellowship or Cell names.

## ADDED Requirements

### Requirement: Units list opens the same create modal for every addable layer

When a church manager adds a unit from the Units layer list, the system SHALL open the create-unit modal for that layer. The system MUST NOT use a name-only popover for Cell or any other org layer.

#### Scenario: Church with only Cell

- **WHEN** the church template is Church → Cell and the manager is on the Cell tab of Units
- **AND** they choose Add
- **THEN** the create-unit modal opens
- **AND** it uses the Cell display name in the title and steps
- **AND** it does not ask for a parent unit

#### Scenario: Fellowship church still uses the modal

- **WHEN** the church template includes a Fellowship layer and the manager is on the Fellowship tab of Units
- **AND** they choose Add
- **THEN** the create-unit modal opens (same engine as Cell)

### Requirement: Create-unit steps follow template position

The create-unit modal SHALL include:

1. Name and place (parent picker only when the layer is not the top org layer and a parent is required)
2. Leader for that unit
3. First deepest-layer child only when the layer being created is not the deepest org layer

Step and button labels SHALL use the layer display names from the template.

#### Scenario: Mid-layer create includes first child

- **WHEN** the manager creates a unit on a layer above the deepest layer (for example Fellowship above Cell)
- **THEN** the modal includes a step to name the first unit on the deepest layer
- **AND** saving creates both units

#### Scenario: Deepest-layer create skips first child

- **WHEN** the manager creates a unit on the deepest org layer
- **THEN** the modal has no first-child step
- **AND** saving creates only that unit

#### Scenario: One create attempt creates one unit

- **WHEN** the manager confirms Create (including a double-click or a retried request with the same client request id)
- **THEN** the church gains exactly one new unit on that layer
- **AND** a failed leader/login step does not leave an orphan unit
- **AND** a second create of the same name under the same parent is rejected unless it is the same client request id

### Requirement: Create-unit policy does not branch on layer type names

Whether a parent is required, whether Add is blocked, and whether the first-child step appears SHALL be derived from the ordered template (sort order, parent options, deepest layer), not from comparing the layer standard type or display name to "Fellowship" or "Cell".

#### Scenario: Relabeled deepest layer

- **WHEN** the deepest layer display name is Home group (standard type still Cell)
- **AND** the manager adds a unit on that layer from Units
- **THEN** the modal title and steps say Home group
- **AND** Add still opens the same create-unit modal

#### Scenario: Add blocked until a parent exists

- **WHEN** the active layer requires a parent and the church has no units on the parent layer
- **THEN** Add is disabled
- **AND** the reason names the parent layer's display name

### Requirement: Drill-in Add uses the same create-unit modal

When a manager adds a child layer unit from a unit detail page, the system SHALL open the same create-unit modal, scoped to that parent when the child layer requires a parent.

#### Scenario: Add Cell under a fellowship

- **WHEN** the manager is viewing a fellowship unit and adds a Cell
- **THEN** the create-unit modal opens with that fellowship as the parent
