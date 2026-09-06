## Purpose

Defines how payment transactions appear church-wide in the sidebar versus scoped inside a campaign, with pending and approved merged into one Transactions surface filtered by status.

## ADDED Requirements

### Requirement: Sidebar transactions are church-wide
The sidebar Givings → Transactions entry SHALL show contribution transactions across all campaigns for the church (subject to the actor’s access scope). Status (pending, approved, all) SHALL be selectable as filters or segments on that page, not as separate sidebar destinations.

#### Scenario: Sidebar opens all transactions
- **WHEN** the actor opens Transactions from the sidebar
- **THEN** they see transactions from multiple campaigns they can access
- **AND** they can filter to pending, approved, or all without leaving the page

### Requirement: Campaign transactions are scoped
Inside a campaign, a Transactions tab SHALL show contribution transactions for that campaign tree only (the program and its descendant sub-campaigns). Pending and approved SHALL appear in that one surface via status filter, not as separate Approved / Awaiting tabs.

#### Scenario: Campaign transactions exclude other campaigns
- **WHEN** the actor opens Transactions on Campaign A
- **THEN** rows belong only to Campaign A or its sub-campaigns
- **AND** there is no separate Approved or Awaiting tab required to see approved or pending payments for that tree

### Requirement: Awaiting work remains reachable
Actors who have contributions awaiting their approval SHALL still reach that work from the sidebar Transactions surface (via pending filter and/or badge) and from the campaign Transactions surface when the pending items belong to that campaign tree.

#### Scenario: Pending filter shows awaiting items
- **WHEN** the actor has pending contributions awaiting approval on a campaign
- **AND** they open that campaign’s Transactions with pending selected
- **THEN** those contributions are listed for review actions
