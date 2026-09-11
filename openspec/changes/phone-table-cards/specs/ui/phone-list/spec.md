## Purpose

Gives phone users a stacked card list and a full-row details modal so they can scan and inspect roster, attendance, and giving rows without sideways-scrolling a desktop grid.

## ADDED Requirements

### Requirement: Phone lists use stacked cards

On a viewport narrower than the tablet breakpoint, each product list table SHALL render as a stacked card list instead of a horizontally scrolled column grid. Tablet and wider viewports SHALL keep the existing column grid.

A product list table is any roster, attendance, or giving screen that today shows many rows as a min-width HTML table. Wizards, calendars, metric chips, and roll-call mark sheets are out of scope.

#### Scenario: Phone shows cards

- **WHEN** a leader opens Membership, Units, Attendance All, Attendance by units, Approvals, or a Giving list on a phone-width viewport
- **THEN** each row is a card with a title, up to two secondary lines, and any existing row badges (You, New, Pending)
- **AND** the page does not require horizontal scrolling to read those card fields

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
