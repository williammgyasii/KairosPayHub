## Why

Bundling a first cell (and “is this person the cell leader?”) into mid-layer create makes Fellowship and Cell one flow. Pastors need to add a fellowship with its leader, then add cells later with no leader attached. One modal that creates two units is the complexity.

## What Changes

- Mid-layer create (Fellowship, PFCC, …) creates **only that unit** plus its leader. No first-child step, no yes/no, no `initialCellName`.
- Deepest-layer create (Cell / Home group / …) creates **only that unit**. No leader step and no `leaderMemberId` / `newLeader` on save.
- `createUnitPolicy` answers `includeFirstChildStep` (always off) and `includeLeaderStep` (on only when the layer is not deepest). The wizard does not branch on `Fellowship` / `Cell` names.
- **BREAKING** (API create semantics): `POST /api/structure/nodes` with a new mid-layer leader MUST NOT auto-create a deepest child. The new leader sits on the unit being created.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `structure/unit-create`: Separate mid-layer vs deepest create; drop bundled first child; deepest create has no leader.

## Impact

- Frontend: `create-unit-policy.ts`, `unit-create-wizard.tsx` (and leftover fellowship/cell wizards if they still send `initialCellName`).
- API: `StructureNodeService.ApplyNodeLeaderAsync` — stop auto-cell; drop “must lead first cell” when creating a mid-layer leader.
- Tests: manager (Church → Cell, Fellowship → Cell, PFCC → Fellowship → Cell); wizard step counts; API create-node without auto-cell.
