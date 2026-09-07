## Purpose

Defines how the signed-in dashboard shell presents typography and the sticky topbar so identity, role, and account actions stay readable without feeling cramped across viewports.

## ADDED Requirements

### Requirement: Dashboard uses a shared type scale

The signed-in dashboard SHALL use a shared type scale with named roles for page title, section title, body, and muted meta/eyebrow text. Shell chrome and shared page headers MUST use those roles instead of one-off pixel font sizes.

#### Scenario: Page header title uses page-title role

- **WHEN** a dashboard page renders the shared page header
- **THEN** the page title uses the page-title type role
- **AND** the optional description uses the body or muted body role (not an ad-hoc pixel size)

#### Scenario: Topbar labels avoid one-off pixel sizes

- **WHEN** the dashboard topbar renders church name, account name, or menu section labels
- **THEN** those labels use shared type-scale roles (or equivalent named utilities)
- **AND** they do not use one-off sizes such as `10px` or `11px`

### Requirement: Topbar clusters identity and actions with breathing room

The dashboard topbar SHALL present church identity and user actions as distinct clusters with clear spacing, and MUST be taller than a tightly packed single control row so controls are not visually jammed together.

#### Scenario: Topbar has distinct clusters

- **WHEN** the dashboard topbar is visible
- **THEN** church identity (menu on small screens, brand/name) is grouped separately from notifications and account controls
- **AND** horizontal spacing between those clusters is greater than the spacing used inside each cluster

### Requirement: Role badge is not shown in the topbar on narrow viewports

On narrow viewports, the topbar MUST NOT show an in-bar role badge. Role context MUST remain available inside the account menu. On wider viewports (large breakpoint and up), a non-compact role badge MAY appear in the topbar.

#### Scenario: Narrow viewport hides in-bar role badge

- **WHEN** the viewport is below the medium breakpoint
- **THEN** no role badge appears in the topbar action cluster
- **AND** the account menu still shows the user’s role

#### Scenario: Wide viewport may show full role badge

- **WHEN** the viewport is at or above the large breakpoint
- **THEN** the topbar MAY show the non-compact role badge between identity and account actions
- **AND** it MUST NOT show the compact pill variant in the topbar
