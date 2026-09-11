## Context

See proposal.md for why. Today `createUnitPolicy.includeFirstChildStep` is true when the layer is not deepest. `UnitCreateWizard` then asks for a first child and yes/no. `StructureNodeService.ApplyNodeLeaderAsync` auto-creates a deepest child when `newLeader` is sent for a mid-layer unit, and rejects unless `LeaderIsCellLeader` is true. Members require a `ParentNodeId`.

## Goals / Non-Goals

**Goals:**

- One manager field for “does create attach a leader?” (`includeLeaderStep` = not deepest).
- First-child flag always off; wizard drops that step.
- Mid-layer `newLeader` places the member on the created node; no auto-cell.

**Non-Goals:**

- Assigning a leader after create (roster / edit) — stays as it is.
- Deleting leftover `FellowshipCreateWizard` / `CellCreateWizard` files unless they still send `initialCellName` on a live path.
- Changing who *can* add units.

## Decisions

1. **Policy in `createUnitPolicy`, not the wizard**
   - `includeFirstChildStep` always `false`.
   - `includeLeaderStep` = deepest layer id !== layer id.
   - *Alt:* `standardType === 'Cell'` — breaks Home group / Church → Cell labels.

2. **New mid-layer leader sits on the mid-layer node**
   - `member.ParentNodeId = created unit id`.
   - Drop auto-cell and the `LeaderIsCellLeader` gate for this path.
   - *Alt:* force “pick existing member only” on fellowship create — blocks a brand-new church with no cells yet.

3. **Deepest create sends neither `leaderMemberId` nor `newLeader`**
   - API already treats both-null as no leader (`LeaderMemberId = null`).

## Risks / Trade-offs

- [Roster assumes members only live on deepest nodes] → Smoke fellowship leader on the fellowship node; if a list hides them, fix that list to include mid-layer parents — do not re-bundle a cell.
- [Existing tests POST `newLeader` + auto-cell] → Update create-node tests that expect a sibling cell.

## Migration Plan

Ship FE + API together. Old clients that still send `initialCellName` can be ignored once auto-cell is gone.

## Open Questions

- None that block this chunk.
