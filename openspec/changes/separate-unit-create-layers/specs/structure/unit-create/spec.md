## MODIFIED Requirements

### Requirement: Create-unit steps follow template position

The create-unit modal SHALL include:

1. Name and place (parent picker only when the layer is not the top org layer and a parent is required)
2. Leader for that unit (every layer, including the deepest)

The modal MUST NOT include a first deepest-layer child step. Saving SHALL create exactly one unit on the layer being added.

Step and button labels SHALL use the layer display names from the template.

#### Scenario: Mid-layer create is that unit only

- **WHEN** the manager creates a unit on a layer above the deepest layer (for example Fellowship above Cell)
- **THEN** the modal has name & place and a leader step
- **AND** it has no first-child step and no yes/no about leading a child unit
- **AND** saving creates only that mid-layer unit (no deepest-layer unit)

#### Scenario: Deepest-layer create has a leader and no first child

- **WHEN** the manager creates a unit on the deepest org layer
- **THEN** the modal has name & place and a leader step
- **AND** it has no first-child step
- **AND** saving creates only that unit, with a leader when one was submitted

#### Scenario: One create attempt creates one unit

- **WHEN** the manager confirms Create (including a double-click or a retried request with the same client request id)
- **THEN** the church gains exactly one new unit on that layer
- **AND** a failed leader/login step does not leave an orphan unit
- **AND** a second create of the same name under the same parent is rejected unless it is the same client request id

### Requirement: Create-unit policy does not branch on layer type names

Whether a parent is required, whether Add is blocked, and whether the leader step appears SHALL be derived from the ordered template (sort order, parent options, deepest layer), not from comparing the layer standard type or display name to "Fellowship" or "Cell".

#### Scenario: Relabeled deepest layer

- **WHEN** the deepest layer display name is Home group (standard type still Cell)
- **AND** the manager adds a unit on that layer from Units
- **THEN** the modal title and steps say Home group
- **AND** the modal has a leader step labeled with that display name
- **AND** Add still opens the same create-unit modal

#### Scenario: Add blocked until a parent exists

- **WHEN** the active layer requires a parent and the church has no units on the parent layer
- **THEN** Add is disabled
- **AND** the reason names the parent layer's display name

## ADDED Requirements

### Requirement: New mid-layer leader sits on the created unit

When a manager creates a mid-layer unit with a new leader, the system SHALL place that leader as a member of the created unit. The system MUST NOT create a deepest-layer child in the same request.

#### Scenario: New fellowship leader without a cell

- **WHEN** the manager creates a Fellowship and submits a new leader
- **THEN** the fellowship exists with that member as its leader
- **AND** the church gains no new Cell (or other deepest-layer) unit
