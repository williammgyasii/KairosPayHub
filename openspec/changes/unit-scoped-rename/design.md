## Context

`UpdateNodeAsync` requires church manager. Units ⋯ menu supports Edit but the main roster list never wires `onEdit`. Leaders see `readOnly` and lose Edit entirely.

## Decisions

1. **Policy** — FE `unitEditPolicy` + API check: manager = full; actor `ScopeNodeId === nodeId` = name only; else forbidden.
2. **No unit-number change for leaders** — ignore/reject leadership and unit-number mutations on the leader path.
3. **Reuse** `UnitNodeFormSheet` with `renameOnly` rather than a second modal.

## Risks

Leaders with multiple role assignments: `GetActorScopeNodeIdAsync` uses primary structure role — same as rest of product.
