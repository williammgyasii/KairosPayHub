# structure / template

Defines how pastors create and replace a church structure template before roster nodes exist.

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
