## 1. Policy tests

- [x] 1.1 Update `create-unit-policy.test.ts` so mid-layer create has `includeFirstChildStep: false` and `includeLeaderStep: true`, and deepest create has `includeLeaderStep: false` (Fellowship → Cell and Church → Cell). Verify the tests fail on current policy.

## 2. Manager

- [x] 2.1 Add `includeLeaderStep` and force `includeFirstChildStep` off in `createUnitPolicy`. Verify policy tests pass.

## 3. Wizard

- [x] 3.1 Update `unit-create-wizard.test.tsx`: deepest is name-only; mid-layer is name + leader and has no First cell. Verify they fail, then wire the wizard to `includeLeaderStep` and stop sending `initialCellName`. Verify wizard tests pass.

## 4. API

- [x] 4.1 Add/adjust a create-node integration test: new fellowship leader creates no cell and sits on the fellowship. Verify it fails, then stop auto-cell / `LeaderIsCellLeader` gate in `ApplyNodeLeaderAsync`. Verify the test passes.

## 5. Smoke

- [x] 5.1 Restart local servers; create a fellowship with a new leader (no cell appears); create a cell under it with no leader step.
