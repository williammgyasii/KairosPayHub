## Context

See proposal.md for why. Today `AddLayerButton` in `roster-view.tsx` opens `FellowshipCreateWizard` only when `standardType === 'Fellowship'`; every other layer (including Cell on a Church → Cell template) gets a name-only popover. `roster-unit-view.tsx` has a second split: Fellowship wizard vs `CellCreateWizard` vs a generic sheet. The two wizards already share the same step shell and `POST /api/structure/nodes`. Helpers in `structure-tree.ts` (`layerRequiresParent`, `layerParentOptions`, `getDeepestLayer`, `nextUnitNumberForParent`) already encode most policy without type names — the UI just ignores them for Cell on the list.

## Goals / Non-Goals

**Goals:**

- One `createUnitPolicy(tree, layer, scopeUnitId)` manager that answers: can add, blocked reason, parent required, parent options, default parent, include first-child step, labels.
- One `UnitCreateWizard` engine that consumes that policy and the existing create-node payload (name, parent, leader, optional first deepest child).
- Units list and unit drill-in both open that wizard.
- Tests lock Church → Cell, Fellowship → Cell, and a three-layer template so the next relabel does not need a new `if`.

**Non-Goals:**

- Changing evolve/rename layers. `POST /api/structure/nodes` now accepts an optional `clientRequestId` for idempotency.
- Rewriting giving, attendance, or member-create wizards (they still have type-name branches; out of this change).
- Auto-provisioning a login when promoting an existing member with no `AuthUserId` (current API behavior).

## Decisions

1. **Volatility split: manager vs engine**  
   Policy (what Add means on this tab) changes per church. The modal steps do not. Keep them in separate modules so roster views never switch on `Fellowship` / `Cell`.  
   *Alt:* One mega-component with `if (isFellowship)` — that is the current failure mode.

2. **Policy keys off template position, not standard type**  
   Parent required = layer is not sort 0 (or `layerRequiresParent`). First-child step = layer id ≠ deepest layer id. Labels = `displayName`. Standard type stays on the API for member-placement (deepest must be Cell) but MUST NOT gate the create UI.  
   *Alt:* Map each `StructureLayerType` to a wizard — still a special case per enum value (Group/PFCC/Fellowship/Cell).

3. **Reuse existing create-node contract**  
   Fellowship wizard already posts a new leader plus first cell when the layer is not deepest. Cell wizard posts a leader on the new node. The engine calls the same endpoint; the manager only decides which fields to send.  
   *Alt:* New API — unnecessary for this UX.

4. **First-child “leader must lead the child” is mid-layer policy**  
   When creating a non-deepest unit, keep today’s “leader is also first deepest-child leader” rule, keyed off “this layer is not deepest,” not Fellowship. When creating the deepest layer, skip that step (Powerhouse).  
   *Alt:* Always require a first child — breaks Church → Cell.

5. **Delete the popover; keep one Add button style**  
   Use the existing prominent Add button for every layer. Remove `AddLayerButton`’s inline form. `FellowshipCreateWizard` / `CellCreateWizard` become wrappers or go away once the engine covers both.

6. **Create is locked and idempotent**  
   The wizard starts at most one in-flight POST (`createOnceLock` + `clientRequestId`). The API replays the same `clientRequestId`, rejects a second unit with the same name under the same parent, and wraps node + leader in one transaction so a failed login cannot leave an orphan unit. Invite email is sent after commit.

## Risks / Trade-offs

- [Missed Fellowship-only UX] → Mid-layer first-child + “leader leads first child” stays in the manager; cover with a Fellowship → Cell test so we do not drop it.
- [Cell list under a parent still needs a default parent] → When `scopeUnitId` is set, policy pins `defaultParentId` to that unit; no picker if only one option.
- [Other screens still hardcode Fellowship] → Document as follow-up; do not expand this change.

## Migration Plan

EF adds nullable `structure_nodes.ClientRequestId` plus a unique filtered index on `(ChurchId, ClientRequestId)`. Deploy API before or with the SPA. Rollback is revert; unused column is harmless.

## Open Questions

None that block the spec or tasks. Leader existing-vs-new picker on deepest-layer create follows `CellCreateWizard` (existing member if any are in scope; otherwise new leader).
