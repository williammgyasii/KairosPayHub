## Why

Pastors need to drop a layer from the Structure canvas (minus on Fellowship, not on Cell) and to start over when the current tree is wrong. Today the canvas has no minus, Delete structure uses a browser confirm, and the API refuses unless Roster is empty — so they cannot reset a live church without hand-deleting every unit.

## What Changes

- Restore a minus on removable layers on the saved Structure canvas. Church, Cell (deepest), and Member never show it.
- Empty roster: minus saves the template without that layer (existing PUT).
- Live roster: minus does not peel one layer off a live tree. A custom modal points them to Delete structure.
- **BREAKING:** `DELETE /api/structure/template` wipes the church’s operational data so nothing is orphaned: units, members, attendance, giving, and other rows that point at those records. The church tenant, pastor login, and church settings remain. The pastor lands on a blank structure definition.
- Replace the browser `confirm` with the same in-app warning modal pattern as unit delete. The copy warns that this deletes all units, all church members, attendance, and giving, and resets the church.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `structure/template`: canvas minus for removable layers; Delete structure is a full operational reset with an in-app warning, not an empty-roster-only delete.

## Impact

- API: `DeleteTemplateAsync` becomes a church operational wipe (order matters: giving/attendance before members/nodes). Pastor and `church_tenants` row stay.
- Frontend: Structure canvas minus + `canRemoveStructureLayer` manager; `Modal` for layer-remove and structure-reset (no `window.confirm`).
- Tests: API wipe leaves no members/nodes/programs/occurrences; canvas policy tests for US-style Fellowship→Cell and Church→Cell; modal copy.
