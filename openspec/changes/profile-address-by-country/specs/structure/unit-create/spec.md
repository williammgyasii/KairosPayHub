## ADDED Requirements

### Requirement: Leader step uses church address policy

The create-unit leader step SHALL show address fields from the church country policy. It MUST NOT hardcode United States or Ghana field layouts.

#### Scenario: Add cell leader on a US church

- **WHEN** the church country is US
- **AND** they open the create-unit modal for the deepest layer
- **AND** they reach the leader step
- **THEN** they see a State dropdown
- **AND** the street field is labeled Home address

#### Scenario: Add cell leader on a Ghana church

- **WHEN** the church country is GH
- **AND** they open the create-unit modal for the deepest layer
- **AND** they reach the leader step
- **THEN** they do not see a State dropdown
- **AND** the street field is labeled Residence / location
