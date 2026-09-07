## Purpose

Lets church leaders open a member from the membership roster into full pages for profile overview, attendance history, givings, and edit—with a sticky name column on the roster table for usable horizontal scroll.

## ADDED Requirements

### Requirement: Membership roster name column is sticky

The membership roster table SHALL keep the member name column fixed while scrolling horizontally. Sticky behavior SHALL remain usable on narrow viewports (name remains sticky; other columns scroll).

#### Scenario: Horizontal scroll keeps name visible

- **WHEN** an actor scrolls the membership table horizontally on a narrow viewport
- **THEN** the member name column remains visible on the left

### Requirement: Member actions navigate to dedicated pages

From the membership roster row actions menu, the system SHALL offer View profile, View attendance, View givings, and Edit profile (when the actor can edit). Each action SHALL navigate to a dedicated routed page (not a side sheet as the primary surface).

#### Scenario: View profile opens member page

- **WHEN** the actor chooses View profile for a member
- **THEN** the app navigates to that member’s profile page with breadcrumbs including Membership and the member name

#### Scenario: View attendance opens attendance page

- **WHEN** the actor chooses View attendance for a member
- **THEN** the app navigates to that member’s attendance page

#### Scenario: View givings opens givings page

- **WHEN** the actor chooses View givings for a member
- **THEN** the app navigates to that member’s givings page

#### Scenario: Edit profile opens edit page

- **WHEN** an actor who can edit chooses Edit profile
- **THEN** the app navigates to that member’s edit page

### Requirement: Member profile page shows overview dashboard

The member profile page SHALL show the member’s identity, role/position, structure placement, and summary entry points (or summary metrics) for attendance and givings, and SHALL be usable on mobile viewports.

#### Scenario: Profile shows identity and structure

- **WHEN** an authorized actor opens a member profile page
- **THEN** the page shows the member name and structure context
- **AND** provides navigation to attendance and givings pages

### Requirement: Member attendance history API and page

The system SHALL expose an authenticated API to list a member’s attendance history (occurrence date, meeting type, status, and scope unit when known) with pagination and a small summary of present/absent/recorded counts. The member attendance page SHALL render that history responsively.

#### Scenario: History lists recorded statuses for a member

- **WHEN** a member has Present and Absent entries across occurrences
- **AND** an authorized actor requests that member’s attendance history
- **THEN** the response includes those entries with status and occurrence date
- **AND** summary counts reflect present and absent totals

#### Scenario: Unauthorized actor cannot read another church’s member history

- **WHEN** an actor requests attendance history for a member outside their church
- **THEN** the API responds with not found or forbidden

### Requirement: Member givings page lists contributions

The member givings page SHALL list the member’s contributions (campaign, amount, date, status) using the existing member contributions API, with breadcrumbs and a responsive layout.

#### Scenario: Givings page shows contribution rows

- **WHEN** a member has approved contributions
- **AND** an authorized actor opens the member givings page
- **THEN** those contributions are listed with campaign and amount

### Requirement: Member can be fetched by id for deep links

The system SHALL allow an authorized actor to fetch a single member by id within their church so profile routes work on refresh/deep link.

#### Scenario: Get member by id

- **WHEN** an authorized actor requests `GET` member by id for a member in their church
- **THEN** the API returns that member’s profile fields
