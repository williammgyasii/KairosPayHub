## Purpose

Defines when leaders may log contributions on a main campaign versus only on its sub-campaigns, using the root receive-givings-on-main setting.

## ADDED Requirements

### Requirement: Parent contributions require receive-givings-on-main
The system SHALL allow creating a contribution on a root campaign only when receive-givings-on-main is enabled and the campaign otherwise accepts contributions (approved, open, logging window). When receive-givings-on-main is disabled, the system MUST reject new contributions on that root and MUST NOT present log-on-main actions in the UI.

#### Scenario: Log on main when receive is on
- **WHEN** a root campaign has receive-givings-on-main enabled
- **AND** the campaign is open and approved
- **AND** a leader logs a contribution on the main
- **THEN** the contribution is created successfully

#### Scenario: Reject log on main when receive is off
- **WHEN** a root campaign has receive-givings-on-main disabled
- **AND** a leader attempts to log a contribution on the main
- **THEN** the system rejects the create
- **AND** the UI does not offer log giving on that main campaign

#### Scenario: Sub-campaign logging unaffected
- **WHEN** a root campaign has receive-givings-on-main disabled
- **AND** an approved open sub-campaign exists under it
- **THEN** leaders can still log contributions on that sub-campaign

### Requirement: Parent totals still include direct and sub amounts
When receive-givings-on-main is or was enabled, approved contributions on the main and on descendants SHALL continue to roll into the root total and rollup.

#### Scenario: Mixed history after turn-off migrate
- **WHEN** direct main contributions were moved to a sub during turn-off
- **AND** later gifts are logged on subs
- **THEN** the root totalApprovedAmount equals the sum of approved amounts on the campaign tree
- **AND** no approved contribution remains attached to the root as a direct gift
