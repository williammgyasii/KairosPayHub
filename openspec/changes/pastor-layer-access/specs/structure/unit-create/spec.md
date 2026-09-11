## ADDED Requirements

### Requirement: Add unit follows create-child-units and scope

The Units list and unit drill-in SHALL show Add for a layer when the actor has create-child-units and may create on that layer (church-wide: any layer; scoped: only the immediate child layer of their unit). Add MUST NOT be gated on pastor or church-admin role names. The create API SHALL use the same rule. Actors without the ability MUST NOT see an enabled Add for that layer and MUST be rejected if they post a node.

#### Scenario: Mid-layer leader sees Add cell under their unit

- **WHEN** a mid-layer leader with create-child-units opens their unit on the child-layer tab
- **THEN** Add is available and uses that child layer’s display name
- **AND** the header is not locked read-only solely because they are not a pastor

#### Scenario: Mid-layer leader does not see Add fellowship on the church list

- **WHEN** a mid-layer leader with create-child-units opens the church-wide Units list on their own layer
- **THEN** Add for that layer is not available

#### Scenario: Create-child-units off hides Add

- **WHEN** the pastor has turned create-child-units off for that leader’s layer
- **THEN** Add is not available on the child-layer tab
- **AND** posting a node is rejected

#### Scenario: Pastor still adds any layer

- **WHEN** a pastor opens Units
- **THEN** Add remains available for each unlocked layer

#### Scenario: Deepest-layer create includes a leader

- **WHEN** a mid-layer leader with create-child-units adds a unit on the child layer
- **THEN** the modal includes a leader step for that child layer’s display name

#### Scenario: Mid-layer leader deletes a child unit in scope

- **WHEN** a mid-layer leader with create-child-units deletes an immediate-child unit in their subtree
- **THEN** the unit is removed
- **AND** they cannot delete their own unit or a unit outside their subtree

#### Scenario: Member cannot remove themselves

- **WHEN** a leader opens Membership
- **THEN** Remove member is not offered on their own row
- **AND** the API rejects deleting their own member record

#### Scenario: Scoped units table still shows the parent name

- **WHEN** a deepest-layer leader opens Units
- **THEN** the Parent column shows their parent unit’s name
- **AND** that parent unit is not listed as a row they can manage
- **AND** members sitting on the parent unit are not included in their roster
