## Purpose

Keeps overall givings usable as campaign columns grow: sticky identity columns adapt to viewport width, and default visibility stays dense so scrolling columns remain reachable.

## ADDED Requirements

### Requirement: Default visibility keeps campaign amount columns hidden

By default, the overall givings table MUST show core ranking columns (rank, member, approved total, payments, last given, actions) and structure layer columns, and MUST NOT show per-campaign amount columns until the actor enables them via column visibility. Visibility preferences MAY still persist after the actor customizes them.

#### Scenario: Fresh defaults hide campaign columns

- **WHEN** an actor opens Overall givings with no saved column preferences (or after a storage-key migration)
- **AND** the loaded data includes multiple campaigns
- **THEN** per-campaign amount columns are not visible by default
- **AND** rank, member, approved total, and last given remain visible

#### Scenario: Actor can enable a campaign column

- **WHEN** the actor enables a campaign amount column via the Columns control
- **THEN** that campaign column is rendered in the table

## MODIFIED Requirements

### Requirement: Sticky header and identity columns

The overall givings table SHALL keep the header row fixed while scrolling vertically. While scrolling horizontally, sticky identity columns SHALL depend on viewport width:

- Narrow viewports (below the medium breakpoint): Member only
- Medium viewports: Rank and Member
- Large viewports and above: Rank, Member, and Approved total

#### Scenario: Narrow viewport sticks member only

- **WHEN** the viewport is below the medium breakpoint
- **AND** the actor scrolls the table horizontally
- **THEN** only the Member column remains fixed on the left
- **AND** Rank and Approved total scroll with other columns

#### Scenario: Large viewport sticks identity and total

- **WHEN** the viewport is at or above the large breakpoint
- **AND** the actor scrolls the table horizontally past campaign columns
- **THEN** Rank, Member, and Approved total remain visible on the left
