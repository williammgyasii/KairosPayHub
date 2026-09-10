## Context

See proposal.md. `DELETE /api/structure/template` currently 400s when any `structure_nodes` or `church_members` exist. Attendance entries and contributions `Restrict` on `MemberId`, so members cannot be deleted first. Nodes `Restrict` on parent/layer. The saved canvas help text still mentions minus; the control was removed. Unit delete already uses `Modal` (`UnitDeleteModal`). Setup wizard still has a trash control on mid layers (`canRemove = layers.length > 1 && index !== cellIndex`).

## Goals / Non-Goals

**Goals:**

- One wipe transaction: no leftover rows that reference deleted members or nodes.
- One layer-remove manager used by the canvas (and later any other surface).
- In-app confirmations only (`Modal`), matching unit delete.

**Non-Goals:**

- Evolving a live tree by collapsing one mid layer (re-parent fellowships → church). That stays out; live minus only points at full reset.
- Deleting the `church_tenants` row or the organization.
- Changing first-time setup wizard minus (already correct).
- Profile / home-address work (parked).

## Decisions

1. **Keep `DELETE /api/structure/template` as the reset endpoint**  
   Same verb pastors already use. Body stays empty. Behavior becomes wipe-then-drop-template.  
   *Alt:* New `POST /api/structure/reset` — clearer name, extra route, two delete stories.

2. **Wipe order (one DB transaction)**  
   Delete church-scoped rows that `Restrict` on members/nodes **before** members/nodes/template:
   - Contributions (and thereby batches if they only exist for those contributions)
   - Giving program scope nodes + programs (children before parents)
   - Attendance entries, invitee entries, first timers, cell invitees, scope submissions, occurrences, meeting-type scope nodes, meeting types
   - Calendar events (they store `ScopeNodeId`)
   - Church-scoped notifications that link into roster/structure
   - Members (clear `LeaderMemberId` / invitee FKs first or rely on `SetNull`)
   - Nodes (children before parents, or disable constraints in-transaction)
   - Role assignments **except** the acting pastor’s church-manager row
   - Template + layers  
   Then invalidate structure cache.  
   *Alt:* Delete the structure church row and recreate it — loses country, currency, branding, administrators.

3. **What stays**  
   `church_tenants` (name, country, currency, timezone), `churches` / org login church, church administrators, acting pastor Identity user + church-manager role.  
   Member-linked leader logins lose `church_members` and scoped `role_assignments`. They MUST NOT keep a cell/fellowship role on this church. Do not delete the pastor’s Identity user. Other churches’ users untouched.

4. **Layer remove is a manager**  
   `canRemoveStructureLayer(layers, index)`: true when there is more than one layer and `index` is not the last (Cell). Never Church or Member (those are not in `layers`). Canvas reads `canRemove`; no `standardType === 'Fellowship'`.  
   Empty roster: minus → confirm modal → `PUT /api/structure/template` without that layer.  
   Live roster: minus → warning modal with a button that opens the same reset modal. No PUT/evolve.

5. **Shared danger modal engine**  
   Reuse `Modal` like `UnitDeleteModal`. One `StructureResetModal` for Delete structure. Layer-empty-roster can be a smaller confirm. No `window.confirm`.

## Risks / Trade-offs

- [Irreversible wipe] → Modal copy is explicit; no undo. Transaction so a mid-wipe failure rolls back.
- [Pastor locked out] → Never delete the acting pastor’s church-manager assignment or Identity user. Assert in the API test that a follow-up `GET /api/structure` still works.
- [Leader logins still exist] → They can sign in but have no roster/role. Acceptable; deleting Identity users they use for another church would be worse.
- [Giving attachments in R2] → DB rows go away; orphan object storage is OK for this change (not queryable). Follow-up if we need a cleanup job.
- [Other churches] → Wipe filters strictly by `ChurchId`.

## Migration Plan

Deploy API first (new delete behavior), then SPA (minus + modals). Old SPA that still `confirm`s then DELETEs will now wipe — acceptable because only church managers can call it. Rollback: revert API to empty-roster 400.

## Open Questions

None that block apply. Calendar events and church-scoped notifications are included in the wipe so node/member FKs cannot orphan.
