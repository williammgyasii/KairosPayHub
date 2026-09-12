## Purpose

Gives signed-in leaders a thumb-reachable bottom tab bar on phone and tablet, with the same destinations the sidebar already offers that role, while desktop chrome stays a sidebar.

## ADDED Requirements

### Requirement: Bottom tabs appear only below the sidebar breakpoint

The signed-in shell SHALL show a persistent bottom tab bar when the viewport is narrower than the existing desktop sidebar breakpoint (`lg`). At `lg` and wider the shell MUST keep the current sidebar and MUST NOT show the bottom tab bar.

#### Scenario: Phone shows tabs

- **WHEN** a signed-in leader opens the dashboard on a viewport narrower than `lg`
- **THEN** a bottom tab bar is visible
- **AND** the hamburger menu that previously opened the mobile sidebar is not shown

#### Scenario: Desktop keeps the sidebar

- **WHEN** a signed-in leader opens the dashboard on a viewport of `lg` or wider
- **THEN** the existing sidebar is visible
- **AND** no bottom tab bar is shown

### Requirement: Tab set comes from the role’s existing nav tree

The tab bar SHALL show at most five tabs. The set of tabs and each tab’s landing path MUST be derived from the same destinations that role already sees in the sidebar. The tab bar MUST NOT hard-code church role names or structure layer types.

Promoted tabs, in order when the role has that destination:

1. Home — dashboard (`.`)
2. Attendance — that role’s existing Attendance landing
3. Givings — that role’s existing Givings landing
4. Roster — that role’s existing Roster landing (omitted when the sidebar has no Roster)
5. More — overflow for every remaining sidebar destination

If the role has fewer than four promoted destinations, unused slots MUST be omitted (do not invent filler tabs). More MUST still appear whenever any sidebar destination is not promoted.

#### Scenario: Church manager sees five tabs including Roster and More

- **WHEN** a church manager (pastor / admin) is signed in on a phone
- **THEN** the tab bar shows Home, Attendance, Givings, Roster, and More
- **AND** More includes Structure, Settings, and the other sidebar destinations that were not promoted

#### Scenario: Cell leader without Structure still gets Attendance and Givings

- **WHEN** a cell leader is signed in on a phone
- **THEN** the tab bar includes Home, Attendance, Givings, and More
- **AND** Roster appears only if that cell leader’s sidebar already includes Roster
- **AND** Structure does not appear as a primary tab

#### Scenario: Leader without Roster does not get a Roster tab

- **WHEN** a leader whose sidebar has no Roster group is signed in on a phone
- **THEN** the tab bar does not include Roster
- **AND** Home, Attendance (if present), Givings (if present), and More remain

### Requirement: Tabs navigate existing routes

Tapping a promoted tab SHALL navigate to that tab’s landing path on the existing router. Nested pages under the same section MUST keep that tab marked active. Tapping More SHALL open an overflow sheet that lists the remaining sidebar destinations; choosing one MUST navigate to that existing route and close the sheet.

#### Scenario: Attendance stays active on a nested attendance page

- **WHEN** a leader is on a nested Attendance route (for example mark attendance or metrics)
- **THEN** the Attendance tab is marked active
- **AND** no other promoted tab is marked active

#### Scenario: Overflow destination uses More

- **WHEN** a church manager is on Settings
- **THEN** More is marked active
- **AND** tapping More shows Settings among the overflow destinations
- **AND** choosing Settings navigates to the existing Settings route

#### Scenario: More lists only leftover destinations

- **WHEN** a leader opens More
- **THEN** the sheet lists every sidebar destination that is not a promoted tab landing
- **AND** it does not duplicate Home, Attendance, Givings, or Roster when those are already tabs
- **AND** sibling destinations under a promoted group still appear (Membership under Roster, Mark attendance under Attendance, Transactions under Givings)

### Requirement: Safe area and content clearance

The tab bar SHALL stay above the device home indicator (safe-area inset). Dashboard page content MUST remain reachable — the last content MUST NOT sit permanently under the tab bar.

#### Scenario: Content clears the tab bar

- **WHEN** a leader scrolls to the bottom of a dashboard page on a phone
- **THEN** the last interactive content remains above the tab bar

### Requirement: Bell and account stay in the topbar

The tab bar MUST NOT add a Notifications tab or a You tab. The existing topbar bell and account menu remain the surfaces for inbox and profile.

#### Scenario: Inbox is still the topbar bell

- **WHEN** a leader is on a phone dashboard
- **THEN** the notification inbox is opened from the topbar bell
- **AND** the tab bar has no Bell or You tab
