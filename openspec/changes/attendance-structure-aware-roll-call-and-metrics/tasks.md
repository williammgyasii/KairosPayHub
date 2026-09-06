## 1. Meeting type form polish

- [x] 1.1 Remove Open now (demo) from meeting-type create UI (and stop sending `openNowForDemo` from FE); verify create form has no demo checkbox
- [x] 1.2 Align Submission opens / Deadline grid layout; verify fields line up with Always open off

## 2. Submission layer API

- [x] 2.1 Add `SubmissionLayerId` on meeting type + EF migration with backfill (Cell layer if present, else deepest template layer); verify migration applies
- [x] 2.2 Expose layer on create/update/list DTOs; validate layer belongs to church template; verify API tests for create with chosen layer
- [x] 2.3 Change roll-call sync to create sheets for nodes on `SubmissionLayerId` (not hard-coded Cell); verify integration test for Fellowship-start meeting
- [x] 2.4 Authorize submit via leadership of the scope node (structure-aware); verify cell and fellowship submitters per layer choice

## 3. Approval one-hop

- [x] 3.1 Route attendance approval to immediate parent unit leaders; pastor not default queue; verify fellowship leader sees cell submissions and pastor is not required
- [x] 3.2 No church-manager override for attendance approval; when parent has no leader, pastor queue stays empty and approve is forbidden; verify with integration test

## 4. Meeting form + dual-hat FE

- [x] 4.1 Add Submissions start at select (template layers) on create/edit; verify options match structure template
- [x] 4.2 Dual-hatted scope picker when multiple editable sheets; verify fellowship+cell leader can choose unit

## 5. Metrics navigation + table

- [x] 5.1 Metrics entry lists meeting types; navigate into type; verify route/IA
- [x] 5.2 Occurrence/date selection with view metrics and log roll call entry points; verify selectable dates
- [x] 5.3 Summary tiles: present, members, first-timers, guests, pending approval, approved child units with structure-aware labels; verify labels not hard-coded “cells” when layer differs
- [x] 5.4 Filterable/searchable unit table (campaign-style); verify search/filter works

## 6. Verify

- [x] 6.1 Integration/FE tests for submission layer + one-hop approval pass
- [x] 6.2 Restart servers; smoke create meeting with layer choice, submit, approve, metrics path

## 7. Pastor submissions surface

- [x] 7.1 Hide Submissions nav / pastorDemo for church managers without roll-call scopes; verify pastor without unit leadership cannot submit via Submissions

## 8. Mark attendance + church-local today

- [x] 8.1 Rename Submissions nav/page to Mark attendance; verify label
- [x] 8.2 Occurrence generation and FE “today” use church timezone; verify late Saturday Toronto still creates/selects that Saturday
- [x] 8.3 Metrics empty states explain mark → approve flow; verify copy
