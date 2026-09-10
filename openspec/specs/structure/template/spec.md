# structure / template

Defines how pastors create and replace a church structure template before roster nodes exist.

## Requirements

### Requirement: Empty-roster template can be replaced

While a church has no structure nodes, a pastor SHALL be able to replace the structure template, including removing a non-Cell layer, as long as the deepest remaining layer is Cell.

#### Scenario: Remove Fellowship layer when roster is empty

- **WHEN** a church has a Fellowship → Cell template and no structure nodes
- **AND** a pastor saves a template with only Cell
- **THEN** the template is stored as a single Cell layer
- **AND** the request succeeds

#### Scenario: Re-save existing empty template

- **WHEN** a church has a Fellowship → Cell template and no structure nodes
- **AND** a pastor saves the same layer list again (for example after a rename)
- **THEN** the template is updated successfully

### Requirement: Structure canvas has no remove control on layers

The saved structure definition canvas SHALL NOT show a minus that deletes a layer. Removing a layer happens only by replacing the template (empty roster) or evolving it.

#### Scenario: Structure canvas has no remove control on layers

- **WHEN** a pastor views the saved structure definition canvas
- **THEN** layer boxes do not show a minus control that deletes a layer
- **AND** removing a layer still happens only by replacing the template (empty roster) or evolving it, not from the canvas node
