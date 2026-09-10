## 1. Layer-remove manager

- [x] 1.1 Add failing tests for `canRemoveStructureLayer` on Fellowship → Cell (only Fellowship removable) and Church → Cell (none removable); verify tests fail
- [x] 1.2 Implement `canRemoveStructureLayer(layers, index)` from position (not `standardType` name strings); verify manager tests pass

## 2. Delete-structure wipe (API)

- [x] 2.1 Change `Delete_template_requires_empty_roster` into a failing wipe test: church with units, members, a contribution, and attendance still returns success; afterward that church has no template/nodes/members/programs/occurrences, pastor can `GET /api/structure`, and a second church is untouched; verify the test fails
- [x] 2.2 Keep/extend the empty-template delete test so it still passes after the wipe implementation
- [x] 2.3 Implement transactional `DeleteTemplateAsync` wipe (giving/attendance/events/notifications, then members/nodes, then template; keep pastor church-manager access); verify API tests pass

## 3. Canvas minus + in-app modals

- [x] 3.1 Add failing frontend tests: empty-roster Fellowship shows minus and Church/Cell/Member do not; Church → Cell shows no minus; verify tests fail
- [x] 3.2 Restore minus on the saved canvas from the manager; empty roster confirm uses `Modal` then `PUT` without that layer; live roster minus opens a warning that offers Delete structure and does not change the tree; verify canvas tests pass
- [x] 3.3 Replace `window.confirm` with `StructureResetModal` (units, members, attendance, giving, reset church); cancel leaves data; verify no `window.confirm` remains on Structure

## 4. Verification

- [x] 4.1 Run the new frontend manager/canvas tests and the template API wipe tests
- [x] 4.2 Restart local servers and smoke: minus on Fellowship (empty), Delete structure warning modal, cancel, then confirm on a church with units

## 5. Reuse leader email after reset

- [x] 5.1 After wipe, the same cell-leader email can be provisioned again; an email that still has a church role stays blocked
