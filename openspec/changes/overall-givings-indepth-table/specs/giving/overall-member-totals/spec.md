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

### Requirement: Campaigns column shows count, chips, and expand detail
The overall givings table SHALL show a campaigns column with a count of campaigns and truncated title chips for each member row. Expanding a row SHALL reveal the full campaign list with approved amount (and count) per campaign, including main and sub campaigns.

#### Scenario: Chips and count for multiple campaigns
- **WHEN** a member has approved gifts on three campaigns
- **THEN** the campaigns cell shows count 3 and chips for those campaign titles (truncating visually when needed)

#### Scenario: Expand shows full campaign breakdown
- **WHEN** the actor expands that member’s row
- **THEN** the expanded panel lists each campaign with its approved amount for that member

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
