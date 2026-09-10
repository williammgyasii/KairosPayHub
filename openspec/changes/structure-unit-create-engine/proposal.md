## Why

Churches no longer share one Fellowship → Cell chart. A Church → Cell tenant cannot add a cell the same way a Fellowship church adds a fellowship: the Units list still uses a name-only popover for Cell, while Fellowship opens a leader wizard. Hardcoding `standardType === 'Fellowship'` for every new shape will keep breaking. Create-unit policy must come from the template; the wizard must stay one engine.

## What Changes

- Units list and unit drill-in use **one create-unit modal** for every addable org layer (Cell included when it is the only / deepest layer).
- A **create-unit manager** derives policy from the church template (parent required, parent options, deepest vs mid-layer, first-child step, labels) without branching on Fellowship/Cell name strings.
- A **create-unit engine** (one wizard) runs name & place → leader → optional first deepest child, then `POST /api/structure/nodes`.
- Remove the Units-list popover for non-Fellowship layers and stop shipping separate Fellowship/Cell create wizards as the primary path.
- No API contract change: existing create-node + leader payload stays the source of truth.

## Capabilities

### New Capabilities

- `structure/unit-create`: layer-agnostic create-unit modal; manager supplies policy from the template; engine renders one wizard.

### Modified Capabilities

- (none — `structure/template` covers empty-roster template replace only)

## Impact

- Frontend: `roster-view.tsx`, `roster-unit-view.tsx`, `fellowship-create-wizard.tsx`, `cell-create-wizard.tsx`, `add-fellowship-button.tsx`; new policy helper + one wizard.
- API: unchanged `POST /api/structure/nodes` (leader / first-child already supported).
- Tests: frontend unit tests for the manager (Church → Cell, Fellowship → Cell, PFCC → Fellowship → Cell); existing create-node API tests stay.
