## Context

See proposal.md for motivation. Today `AttendanceRollCallSyncService` resolves sheets only for Cell-layer nodes; `AttendanceScopeService` hard-codes CellLeader submit and FellowshipLeader/PFCC approve. Metrics live on a single overview page with cell-centric copy. Meeting-type form still has Open now (demo) beside Always open (`attendance-meeting-windows-timezone`).

## Goals / Non-Goals

**Goals:**
- Persist `SubmissionLayerId` (FK to `structure_layers`) on meeting types; form dropdown from template layers.
- Generate/sync scope submissions for nodes on that layer; authorize submit via leadership of that node (structure-aware, not only `ChurchRole.CellLeader`).
- Approval queue: immediate parent unit’s leader; pastor not default attendance approver.
- Dual-hat: FE scope picker when multiple sheets/assignments apply.
- Metrics routes: types list → type detail → occurrence → table + tiles; structure-aware labels.
- Remove demo checkbox; fix form grid alignment.

**Non-Goals:**
- Multi-hop attendance approval chains (PFCC → Fellowship → Pastor) for default weekly.
- Changing giving approval (pastor remains sensitive for money).
- Full redesign of invitee/first-timer capture beyond tiles/counts.
- Arbitrary free-text layer names outside the template.

## Decisions

1. **Submission layer storage**  
   Store `SubmissionLayerId` → `StructureLayer`. Display name from layer.  
   Alternative considered: store `StructureLayerType` enum only — rejected because templates can have custom display names and multiple custom Group layers; layer id is precise.

2. **Backfill**  
   Existing meeting types: prefer template layer with `StandardType == Cell`; else deepest (highest order index) layer. Document in migration.

3. **Who can submit**  
   Prefer role assignment / leader membership on the scope node (align with structure-aware abilities). Keep AssignedLeaderAuthUserId as override. Deprecate CellLeader-only checks over this change’s tasks.  
   `/me` exposes `canMarkAttendance` (true only when a led node’s layer matches an active meeting type’s `SubmissionLayerId`) plus `layerId` on each roll-call scope. Sidebar Mark attendance and the meeting picker use that — not “any unit leader.”

4. **One-hop approval**
   Parent node of the submission node → leaders assigned to that parent only. Pastors/admins never approve attendance and never see the Approvals nav. If there is no parent leader, the sheet stays pending until a parent-unit leader is assigned (no church-manager override).

5. **Metrics IA**  
   Routes e.g. `/attendance/metrics`, `/attendance/metrics/:meetingTypeId`, occurrence query or nested path. Reuse TanStack patterns from campaign member tables.

6. **Form**  
   Delete Open now demo UI and `openNowForDemo` from create payload usage in FE (API may keep flag unused for compat or remove in same change if low cost).

## Risks / Trade-offs

- [Existing Cell-only data] → Migration + regenerate sheets carefully; don’t duplicate submissions.  
- [Dual assignments] → Scope picker must list only sheets the user can edit.  
- [No parent leader] → Risk of stuck pending; mitigate by assigning a parent-unit leader in Roster (no pastor approval fallback).
- [Large metrics rewrite] → Ship submission-layer + approval first, then metrics IA, then table polish if needed — tasks ordered accordingly.

## Migration Plan

1. Add `SubmissionLayerId` (+ migration/backfill).  
2. Switch roll-call sync + auth to layer.  
3. Adjust approval routing.  
4. FE meeting form (layer select, drop demo, align grid).  
5. Dual-hat picker on submissions.  
6. Metrics navigation + tiles + table.  
7. Restart servers; smoke Cell-start and Fellowship-start churches.

## Open Questions

- None blocking: empty-parent approval stays pending until a parent-unit leader is assigned (no pastor override).
