## Purpose

Defines overall givings member rankings: enriched totals (campaigns given to), deep table UX (columns, filters, expand), and structure-aware display aligned to the church template.

## ADDED Requirements

### Requirement: Member totals include campaigns given to
Each member row in the member-totals response SHALL include the distinct approved campaigns (main and sub) the member gave to within the current query scope, with program id, title, optional parent program id, approved amount, and approved payment count.

#### Scenario: Member gave to main and sub campaigns
- **WHEN** a member has approved contributions on a root campaign and one of its sub-campaigns
- **AND** an authorized actor requests member totals without a program filter (or scoped to that campaign tree)
- **THEN** that member’s row includes both campaigns in the campaigns list with correct approved amounts and counts

#### Scenario: Pending contributions excluded from campaigns list
- **WHEN** a member has only pending (not approved) contributions on a campaign
- **THEN** that campaign MUST NOT appear in the member’s campaigns list on member totals

### Requirement: Overall givings table is sortable and newest-first by default
The overall givings member table SHALL support sorting by approved total, member name, payment count, and last given date, and SHALL default to last given descending so the most recent givers appear first.

#### Scenario: Default sort is last given newest first
- **WHEN** an authorized actor opens Overall givings with no prior sort preference
- **THEN** rows are ordered by last given date descending (nulls last)

### Requirement: Campaigns shown as spreadsheet amount columns
The overall givings table SHALL show one column per campaign (main and sub) that appears in the loaded member totals, with each cell displaying that member’s approved amount for that campaign (or empty when none). The table MUST NOT use an accordion/expand row for campaign detail.

#### Scenario: Member amounts across campaign columns
- **WHEN** a member has approved gifts on a main campaign and a sub-campaign
- **THEN** the table shows separate columns for each campaign with the member’s approved amounts in those cells

### Requirement: Sticky header and identity columns
The overall givings table SHALL keep the header row fixed while scrolling vertically, and SHALL keep the Rank, Member, and Approved total columns fixed while scrolling horizontally.

#### Scenario: Horizontal scroll keeps identity and total visible
- **WHEN** the actor scrolls the table horizontally past campaign columns
- **THEN** Rank, Member, and Approved total remain visible on the left

### Requirement: Structure columns follow church template layers
The overall givings table SHALL offer one structure column per layer defined on the church structure template (using that church’s layer labels). Layers the church does not use MUST NOT appear as columns. Each cell SHALL show the member’s unit name at that layer when known from the structure tree and member parent node.

#### Scenario: No PFCC layer when template has none
- **WHEN** the church template has Fellowship and Cell but no PFCC
- **THEN** the table column catalog includes Fellowship and Cell and does not include a PFCC column

### Requirement: Column visibility is user-controlled
The overall givings table SHALL let the actor hide and show columns from the available catalog (including structure layer columns). Visibility preferences SHOULD persist for the actor in the browser. Changing visibility MUST NOT edit contribution amounts or member records.

#### Scenario: Hide payments column
- **WHEN** the actor hides the Payments column
- **THEN** Payments is not rendered until shown again

### Requirement: Structure and name filters on overall givings
The overall givings table SHALL support filter rules (field, operator, value) for member name and structure layer fields using the same rule semantics as the membership roster filters. Applying filters SHALL narrow the visible member rows to those matching all active rules. A campaign scope control MAY still limit which program tree’s totals are loaded.

#### Scenario: Filter by fellowship unit
- **WHEN** the actor adds a rule that structure layer Fellowship is a specific unit name
- **AND** only some ranked members belong to that unit
- **THEN** only matching members remain visible in the table

#### Scenario: Filter by member name contains
- **WHEN** the actor adds a name contains rule for a substring
- **THEN** only members whose names match that rule remain visible

### Requirement: Amount filters by campaign or approved total
The overall givings table SHALL support amount filters scoped to approved total or a specific campaign, with comparison operators (less than, at most, equals, at least, greater than). Missing campaign amounts SHALL be treated as zero for comparisons.

#### Scenario: Campaign amount less than threshold
- **WHEN** the actor filters a campaign to amounts less than 40
- **AND** one member gave 20 on that campaign and another gave 50
- **THEN** only the member with 20 remains visible
