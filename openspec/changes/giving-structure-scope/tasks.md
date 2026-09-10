## 1. Giving scope manager

- [x] 1.1 Add failing `givingScopePolicy` tests for Fellowship → Cell (no PFCC option, Cell is offered) and PFCC → Fellowship → Cell (all three layers + church-wide for church-wide leadership); verify tests fail
- [x] 1.2 Implement `givingScopePolicy(tree, parent, actor)` (layers, units, church-wide, multi-select same layer, labels from `displayName` / leadership); verify manager tests pass with no `standardType === 'PFCC'` / `'Fellowship'` branches in the policy API

## 2. Persist node-based scope (API)

- [x] 2.1 Add failing API tests: create campaign scoped to a fellowship on a no-PFCC church; reject two units on different layers; reject a sub-campaign outside the parent subtree; allow a cell under the same fellowship parent; verify tests fail
- [x] 2.2 Accept `scopeNodeId` / `scopeNodeIds` without requiring PFCC/Fellowship kind; derive stored kind; keep reading legacy kinds; verify 2.1 tests pass

## 3. Create and approve rights (API)

- [x] 3.1 Add failing API tests: intermediate leader can create a sub-campaign inside their scope; leaf leader cannot create; approval after a cell-leader log skips PFCC when the church has no PFCC managers; verify tests fail
- [x] 3.2 Replace PFCC-only sub-create and `CellLeader → FL → PFCC → Pastor` hops with leadership + “layer exists”; verify 3.1 tests pass

## 4. Single-form engines

- [x] 4.1 Add failing frontend tests: add sub-campaign is one form (no Mode/Schedule/Scope/Review stepper); Fellowship → Cell template does not show a PFCC chip; verify tests fail
- [x] 4.2 Rewrite create-campaign and add-sub-campaign as one form each that read `givingScopePolicy`; verify 4.1 tests pass

## 5. Log, picker, copy

- [x] 5.1 Bulk-log follows intermediate vs leaf from the manager (not `role === 'PFCCManager'`); remittance labels use parent-layer / “level above”; member picker shows every template segment; verify unit tests or a focused wizard test

## 6. Verification

- [x] 6.1 Run manager + wizard frontend tests and the new API integration tests
- [x] 6.2 Restart local servers and smoke add sub-campaign on the current church: scope matches the template, one form, submit creates a sub
