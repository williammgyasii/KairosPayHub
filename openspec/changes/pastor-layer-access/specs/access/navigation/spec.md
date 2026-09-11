## Purpose

Gives pastors a first-class Access place in the app to set layer and administrator abilities, without exposing that place to administrators or other roles.

## ADDED Requirements

### Requirement: Pastor-only Access sidebar and route

The church workspace SHALL include an Access item in the sidebar that opens `/access`. The item SHALL appear only for the Pastor role. ChurchAdmin, scoped leaders, cell leaders, and members MUST NOT see Access. Visiting `/access` without Pastor access SHALL send the user away from that page (home). Settings tabs SHALL remain unchanged; Access is not a Settings tab.

#### Scenario: Pastor sees Access

- **WHEN** a Pastor is signed in and onboarded
- **THEN** the sidebar includes Access
- **AND** opening it shows the Access grid at `/access`

#### Scenario: Administrator does not see Access

- **WHEN** a ChurchAdmin is signed in
- **THEN** the sidebar does not include Access
- **AND** navigating to `/access` does not show the Access grid

#### Scenario: Fellowship leader does not see Access

- **WHEN** a mid-layer leader is signed in
- **THEN** the sidebar does not include Access

### Requirement: Access columns are grouped by product area

Access SHALL use a subject list plus a detail pane, not a spreadsheet and not a stack of every level at once. The list SHALL include each structure level and each administrator subject. The selected subject SHALL show Units, Roster, and Records. Units SHALL contain create child units. Roster SHALL contain one manage-roster ability. Records SHALL contain the six giving abilities: view member givings, log giving, approve giving, view overall givings, create campaign, and create sub-campaign. Grouping MUST come from a category map keyed by ability id, not layer type names.

#### Scenario: Pastor sees grouped Access columns

- **WHEN** a pastor opens Access
- **THEN** a sidebar lists each structure level and administrator subject
- **AND** the selected subject shows Units, Roster, and Records
- **AND** Roster has one manage-roster control
- **AND** Records has the six giving controls
- **AND** create child units sits under Units
