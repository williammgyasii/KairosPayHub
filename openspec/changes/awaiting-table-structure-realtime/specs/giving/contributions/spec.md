## ADDED Requirements

### Requirement: Structure-aware approval columns
Awaiting and approved contribution tables SHALL label and fill the structure unit column from the church’s configured layers. The system SHALL NOT show a PFCC column when the church template has no PFCC layer.

#### Scenario: Church without PFCC
- **WHEN** the structure template has Fellowship and Cell but no PFCC
- **THEN** the awaiting table shows a Fellowship (or Unit) column instead of PFCC
- **AND** cell values use the fellowship/unit name from the member path

#### Scenario: Church with PFCC
- **WHEN** the structure template includes PFCC
- **THEN** the awaiting table may show a PFCC column populated from the member’s PFCC ancestor

### Requirement: Awaiting table actions and layout
The awaiting approval data grid SHALL use TanStack Table patterns, default to newest submissions first, place totals in a separate summary surface, and expose row actions via a three-dot menu (View, Approve, Reject when allowed).

#### Scenario: Approve from kebab menu
- **WHEN** an approver opens the row actions menu on a pending contribution
- **THEN** they can View, Approve, or Reject without separate inline icon button groups

### Requirement: Recent activity approve actions
Recent activity SHALL use denser typography with the status badge on the same line as the member/batch label, and SHALL offer approve/reject for rows awaiting the current viewer’s approval.

### Requirement: Near-realtime contribution refresh
When the client receives a contribution pending/approved/rejected notification over SignalR, giving contribution queries SHALL be invalidated so open campaign views refresh status without a manual reload.

#### Scenario: Pastor approves while enterer has the dashboard open
- **WHEN** an approver approves a contribution
- **AND** the enterer receives `ContributionApproved` over the notifications hub
- **THEN** the enterer’s recent activity / contribution lists refetch and show Approved
