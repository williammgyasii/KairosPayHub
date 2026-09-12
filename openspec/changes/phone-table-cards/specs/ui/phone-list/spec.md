## Purpose

Gives phone users a stacked card list and a full-row details modal so they can scan and inspect roster, attendance, and giving rows without sideways-scrolling a desktop grid.

## ADDED Requirements

### Requirement: Phone lists use stacked cards

On a viewport narrower than the tablet breakpoint, each product list table SHALL render as a stacked card list instead of a horizontally scrolled column grid. Tablet and wider viewports SHALL keep the existing column grid.

A product list table is any roster, attendance, or giving screen that today shows many rows as a min-width HTML table. Wizards, calendars, metric chips, and roll-call mark sheets are out of scope.

#### Scenario: Phone shows cards

- **WHEN** a leader opens Units, Attendance All, Attendance by units, Approvals, or a Giving list on a phone-width viewport
- **THEN** each row is a card with a title, up to two secondary lines, and any existing row badges (You, New, Pending)
- **AND** the page does not require horizontal scrolling to read those card fields

### Requirement: Membership phone list is flush, not nested cards

On a phone-width viewport, Membership SHALL render as edge-to-edge divider rows instead of a bordered table card wrapping bordered row cards. Other phone lists MAY keep stacked cards until they opt into the same chrome.

The Membership row SHALL use a grid: name and actions on the first row, unit and role on the second, and a bottom row with a callable phone number and any New / You / Pending mark. The New mark MUST use a light green, not-fully-pill badge.

Tapping the phone number SHALL start a call (`tel:`) and MUST NOT open the details modal. Tapping the rest of the row SHALL still open details.

#### Scenario: Membership uses the viewport, not cards in cards

- **WHEN** a leader opens Membership on a phone-width viewport
- **THEN** the member list has no outer rounded card and no per-row rounded card
- **AND** rows are separated by dividers and span the content width
- **AND** Units and other phone lists still show stacked cards

#### Scenario: New sits on the bottom row in a light badge

- **WHEN** a recently added member appears on the Membership phone list
- **THEN** New is on the bottom row of that item, not beside the name
- **AND** the badge is light green and less rounded than a pill

#### Scenario: Phone number can be called from the row

- **WHEN** a member row shows a phone number on the Membership phone list
- **THEN** that number is a `tel:` link
- **AND** tapping it does not open the details modal

#### Scenario: Tablet keeps the grid

- **WHEN** the same list is opened at tablet width or wider
- **THEN** the existing column table is shown
- **AND** stacked cards are not shown

### Requirement: Card tap opens full-row details

Tapping a phone card (outside the row actions control) SHALL open a details modal that lists every desktop column for that row as a label and value. Empty values MAY show as an em dash. Closing the modal SHALL return to the card list.

#### Scenario: Tap card to see every column

- **WHEN** a leader taps a Membership card on a phone
- **THEN** a details modal opens titled with the row name
- **AND** each desktop column for that member appears as a label and value (including columns the phone card omitted)

#### Scenario: Sub-campaign card opens the campaign page

- **WHEN** a leader taps a sub-campaign row on the Sub-campaigns tab on a phone
- **THEN** they navigate to that sub-campaign’s existing page
- **AND** a column-dump details modal is not shown
- **AND** the tab does not repeat a Sub givings heading above the list

#### Scenario: Row actions stay on the menu

- **WHEN** a card shows a row actions control
- **THEN** tapping that control opens the existing row menu (edit, accept, delete, and other actions)
- **AND** it does not open the details modal

#### Scenario: Close returns to the list

- **WHEN** the details modal is open
- **AND** the leader closes it
- **THEN** the card list is visible again with the same scroll position intent (same page of results)

### Requirement: Search and paging stay shared

Search, filters, sort controls, column preferences, and pagination SHALL keep working on phone. Changing a filter or page SHALL update the card list the same way it updates the desktop grid.

#### Scenario: Search filters cards

- **WHEN** a leader types a name into the Membership search on a phone
- **THEN** the card list shows the same filtered members the desktop table would show
