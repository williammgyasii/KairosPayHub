## 1. Create-unit manager

- [x] 1.1 Add failing unit tests for `createUnitPolicy` covering Church → Cell (no parent, no first-child), Fellowship → Cell (parent optional on Fellowship, first-child on), PFCC → Fellowship → Cell, Add blocked when parent layer is empty, and labels from `displayName` not `standardType`; verify tests fail
- [x] 1.2 Implement `createUnitPolicy(tree, layer, scopeUnitId)` from template position (reuse `layerRequiresParent`, `layerParentOptions`, `getDeepestLayer`); verify manager tests pass with no `Fellowship`/`Cell` string branches

## 2. Create-unit engine

- [x] 2.1 Add failing frontend tests that Add on the Units list opens the create-unit modal for Cell (Church → Cell) and Fellowship (Fellowship → Cell), and that deepest-layer create omits the first-child step; verify tests fail
- [x] 2.2 Implement `UnitCreateWizard` (name & place → leader → optional first deepest child) posting `POST /api/structure/nodes`; verify engine tests pass
- [x] 2.3 Wire Units list and unit drill-in to the engine; remove the name-only popover and stop using Fellowship/Cell wizards as the primary path; verify Add Cell and Add Fellowship both open the same modal locally

## 3. Verification

- [x] 3.1 Run frontend unit tests for the new manager/engine files and confirm no remaining `standardType === 'Fellowship'` / `'Cell'` gates in roster add-unit UI
- [x] 3.2 Restart local servers and smoke Church → Cell: Units → Add Cell opens the modal, leader step, save creates one unit

## 4. Idempotent create

- [x] 4.1 Add failing API tests: same `clientRequestId` returns one unit, duplicate name is 400, failed leader login leaves no orphan
- [x] 4.2 Frontend lock + `clientRequestId`; API idempotency, duplicate-name check, and create+leader transaction; verify tests pass
