## Purpose

Defines session abilities as the product permission model: what an actor can do, returned by the API and consumed by clients (including CASL), independent of church-specific structure labels or legacy role display names.

## ADDED Requirements

### Requirement: Session profile exposes abilities
An authenticated onboarded actor’s session profile SHALL include a list of product abilities granted for the current church context. Abilities SHALL be opaque stable identifiers (e.g. `viewMemberGivings`, `approveGiving`, `manageChurch`, `logGiving`, `manageStructure`) that do not encode church layer names.

#### Scenario: Cell-scoped leader receives member-givings ability
- **WHEN** an actor is a leader of a leaf (or equivalent) structure unit with the default leaf leadership profile
- **THEN** their session profile includes `viewMemberGivings`
- **AND** does not require the client to match a role string such as `CellLeader`

#### Scenario: Ordinary member lacks manage abilities
- **WHEN** an actor has member-only access with no leadership assignment and is not a church manager
- **THEN** their session profile does not include `manageChurch` or `approveGiving`

### Requirement: API remains authoritative
Granting an ability on the session profile MUST NOT be the only security control. Protected APIs SHALL continue to enforce authorization and structure scope server-side. Missing or forged client abilities MUST NOT expand access.

#### Scenario: Forged client ability is ignored
- **WHEN** a client claims `manageChurch` but the actor is not authorized on the server
- **THEN** church-management endpoints still reject the request

### Requirement: Client consumes packed authorization rules
The session profile SHALL include authorization rules suitable for client-side ability checks (packed CASL-compatible rules or an equivalent documented rule list). The SPA SHALL gate feature UI using those rules (e.g. `can('view', 'MemberGivings')`) rather than comparing role name strings.

#### Scenario: Member givings tab uses ability, not role name
- **WHEN** the actor opens a campaign detail screen
- **AND** their packed rules allow viewing member givings
- **THEN** the Member givings surface is available
- **AND** the UI does not require `role === 'FellowshipLeader'` or `role === 'CellLeader'`

### Requirement: Scope accompanies abilities
The session profile SHALL continue to expose the actor’s structure scope (e.g. scope node id / unit name) when leadership is node-scoped, so clients can label context while the API enforces subtree limits.

#### Scenario: Scoped leader sees scope metadata
- **WHEN** a node leader loads their session profile
- **THEN** the profile includes their scope node identity for display
- **AND** member-totals / contributions APIs still limit rows to that subtree
