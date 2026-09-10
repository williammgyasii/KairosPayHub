## Purpose

Lets pastors choose whether a main campaign receives direct givings or acts as a container for sub-campaigns only, at create time and later in campaign settings.

## ADDED Requirements

### Requirement: Receive-givings-on-main setting on root campaigns
Root (main) campaigns SHALL persist whether they receive direct givings. The setting applies only to root campaigns. Sub-campaigns MUST NOT expose this setting. The product label SHALL be “Receive givings on main campaign?” with help text that explains on vs off behavior.

#### Scenario: Create with receive on
- **WHEN** an authorized actor creates a main campaign with “Receive givings on main campaign?” turned on
- **THEN** the campaign is stored with receive-on-main enabled
- **AND** creating a first sub-campaign in the same flow is optional

#### Scenario: Create with receive off requires a sub
- **WHEN** an authorized actor creates a main campaign with “Receive givings on main campaign?” turned off
- **THEN** they MUST create at least one sub-campaign before the create flow completes
- **AND** the main campaign is stored with receive-on-main disabled

#### Scenario: Help text explains the choice
- **WHEN** the actor views the receive-givings control (create or settings)
- **THEN** help text explains that on allows logging on the main and on subs, and off means leaders log only on sub-campaigns while totals still roll up to the main

### Requirement: Campaign settings can change the setting later
Authorized campaign managers SHALL be able to turn receive-givings-on-main on or off from root campaign settings after create.

#### Scenario: Turn on later
- **WHEN** a root campaign has receive-givings-on-main off
- **AND** an authorized actor turns it on in campaign settings
- **THEN** the setting is saved
- **AND** new direct contributions on the main are allowed when the campaign is otherwise open

#### Scenario: Turn off with no direct contributions
- **WHEN** a root campaign has receive-givings-on-main on
- **AND** it has no direct contributions on the main
- **AND** an authorized actor turns it off in campaign settings
- **THEN** the setting is saved without a migrate step

#### Scenario: Turn off with direct contributions requires move
- **WHEN** a root campaign has direct contributions on the main
- **AND** an authorized actor turns receive-givings-on-main off
- **THEN** the system MUST require choosing an existing sub-campaign or creating a new sub-campaign
- **AND** MUST move those direct contributions to the chosen sub before saving the setting as off
- **AND** MUST NOT save off while direct contributions remain on the main

### Requirement: Existing campaigns default to receive on
Existing root campaigns without an explicit value SHALL behave as receive-givings-on-main enabled after migration.

#### Scenario: Migrated dual-giving campaign
- **WHEN** a root campaign existed before this setting
- **THEN** receive-givings-on-main is enabled
- **AND** leaders can still log on the main when the campaign is otherwise open
