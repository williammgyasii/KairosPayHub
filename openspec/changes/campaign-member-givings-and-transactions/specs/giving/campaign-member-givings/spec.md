## Purpose

Defines the campaign-scoped member givings rankings table: the same deep overall-givings experience restricted to one campaign tree (main + sub-campaign amount columns).

## ADDED Requirements

### Requirement: Campaign member givings matches overall rankings UX
When viewing a campaign, the Member givings surface SHALL use the same rankings table behaviors as Overall givings: sticky Rank, Member, and Approved total; structure columns from the church template; column visibility; structure/name filters; amount filters; horizontal scroll with spreadsheet-style campaign amount columns.

#### Scenario: Pastor opens member givings on a campaign
- **WHEN** an authorized actor opens Member givings on a root campaign that has sub-campaigns
- **THEN** they see member rows with approved totals for that campaign tree and amount columns for the programs in that tree (not unrelated campaigns)

### Requirement: Campaign scope is locked
The campaign Member givings table SHALL load member totals scoped to the current campaign (including descendant sub-campaigns). The actor MUST NOT switch the rankings scope to “All campaigns” from inside that campaign surface.

#### Scenario: No all-campaigns picker inside campaign
- **WHEN** the actor views Member givings on a campaign
- **THEN** the table does not offer an “All campaigns” scope control that would leave that campaign’s tree

### Requirement: Sub-campaign columns within scope
Amount columns on campaign Member givings SHALL reflect programs in the current campaign tree (parent and/or children that have approved gifts in the loaded data), not the full church campaign catalog.

#### Scenario: Only this tree’s programs as columns
- **WHEN** members have approved gifts on this campaign’s January sub-campaign and on an unrelated Sunday campaign
- **AND** the actor views Member givings for this campaign
- **THEN** January appears as a column and the unrelated Sunday campaign does not

### Requirement: Cell leaders can open campaign member givings
Cell leaders SHALL have access to the campaign Member givings surface. Rows remain limited to members in their structure scope (as enforced by the member-totals API).

#### Scenario: Cell leader opens member givings
- **WHEN** a Cell Leader opens a campaign they can access
- **THEN** they see the Member givings tab
- **AND** member rows are limited to their cell scope
