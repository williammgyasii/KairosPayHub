## REMOVED Requirements

### Requirement: Structure canvas has no remove control on layers

**Reason**: Pastors need a minus on mid layers. Empty roster still uses template replace; a live roster opens the structure-reset warning instead of peeling one layer.

**Migration**: Use the canvas minus. Empty roster confirms and PUTs the template without that layer. Live roster offers Delete structure.

## ADDED Requirements

### Requirement: Canvas minus on removable layers

The saved structure canvas SHALL show a remove control on mid layers. It SHALL NOT show a remove control on the church box, the deepest (Cell) layer, or the member leaf. Removability SHALL come from layer position in the template, not from a Fellowship or Cell name string.

#### Scenario: Fellowship church empty roster

- **WHEN** a pastor views a Fellowship → Cell canvas with no units
- **THEN** Fellowship shows a minus
- **AND** Church, Cell, and Member do not

#### Scenario: Church to Cell only

- **WHEN** a pastor views a Church → Cell canvas
- **THEN** no layer shows a minus
- **AND** they cannot drop Cell

### Requirement: Empty-roster minus saves without that layer

When the roster has no units, confirming minus on a removable layer SHALL persist the template without that layer. The deepest remaining layer MUST still be Cell.

#### Scenario: Confirm remove Fellowship

- **WHEN** the roster is empty
- **AND** the pastor confirms minus on Fellowship
- **THEN** the stored template is Cell only
- **AND** the canvas no longer shows Fellowship

### Requirement: Live-roster minus does not peel one layer

When units already exist, minus on a layer SHALL NOT delete that layer or its units. The product SHALL open an in-app warning that they must delete the whole structure to start over.

#### Scenario: Minus on Fellowship after units exist

- **WHEN** a church has at least one unit
- **AND** the pastor uses minus on Fellowship
- **THEN** the template and units are unchanged
- **AND** they see an in-app warning (not a browser alert)
- **AND** they can choose Delete structure from that warning

### Requirement: Delete structure wipes operational data

`DELETE /api/structure/template` SHALL reset the church’s operational data even when units, members, attendance, or giving exist. After success there SHALL be no structure template, units, church members, attendance records, or giving programs/contributions for that church. Rows that pointed at those records MUST also be gone so nothing is orphaned. The church tenant, its settings (name, country, currency, timezone, branding), the acting pastor’s login, and church-manager access SHALL remain. The pastor SHALL then be able to define a new structure. Other churches MUST be unchanged.

#### Scenario: Reset a church that has roster, giving, and attendance

- **WHEN** a pastor confirms Delete structure on a church that has units, members, contributions, and attendance
- **THEN** that church has no template, units, members, giving programs, contributions, or attendance occurrences
- **AND** the pastor can still sign in and open Structure
- **AND** Structure asks them to define a new template
- **AND** another church’s data is untouched

#### Scenario: Empty church delete still works

- **WHEN** a pastor deletes a template with no units
- **THEN** the template is gone
- **AND** they can define a new one

#### Scenario: Same leader email works after reset

- **WHEN** a pastor resets a church that had a cell leader login
- **AND** they define a new structure
- **AND** they create a leader with that same email
- **THEN** the request succeeds
- **AND** a login that still has a role on any church still cannot be reused

### Requirement: Delete structure uses an in-app warning

The product SHALL NOT use a browser confirm or alert for Delete structure. It SHALL use an in-app modal that warns this deletes all units, all church members, attendance, and giving, and resets the church. Cancel SHALL leave all data in place.

#### Scenario: Pastor opens Delete structure

- **WHEN** they choose Delete structure
- **THEN** an in-app modal explains the wipe
- **AND** confirming runs the reset
- **AND** canceling leaves the structure and roster as they were
