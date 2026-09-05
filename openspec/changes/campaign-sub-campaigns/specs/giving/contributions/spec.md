## ADDED Requirements

### Requirement: Parent campaign accepts contributions alongside sub-campaigns
The system SHALL allow logging approved contributions on a main campaign even when sub-campaigns exist under it.

#### Scenario: Log on parent with sub-campaigns present
- **WHEN** a main campaign has one or more approved sub-campaigns
- **AND** a leader logs a contribution on the main campaign
- **THEN** the contribution is created successfully
- **AND** the main campaign reports `acceptsContributions` as true when open and approved

#### Scenario: Parent total includes direct and sub-campaign amounts
- **WHEN** approved contributions exist on both the main campaign and its sub-campaigns
- **THEN** the main campaign `totalApprovedAmount` equals the sum of direct parent approved plus all descendant approved amounts
- **AND** the rollup `totalApprovedAmount` includes both

### Requirement: Legacy parent contributions
Contributions logged on the main campaign before the first sub-campaign was created SHALL be flagged as legacy parent contributions.

#### Scenario: Pre-sub-campaign parent contribution
- **WHEN** a contribution was approved on the main campaign before any sub-campaign existed
- **AND** a sub-campaign is later created
- **THEN** that contribution is flagged `isLegacyParentContribution`

#### Scenario: Post-sub-campaign parent contribution
- **WHEN** a sub-campaign already exists
- **AND** a leader logs a new contribution on the main campaign
- **THEN** the contribution is not flagged as legacy
