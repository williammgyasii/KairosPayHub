## Context

See proposal.md for why. Create campaign and add sub-campaign choose from `ProgramScopeKind` (`ChurchWide` | `PFCC` | `Fellowship` | `FellowshipGroup`). `nodesForScopeKind` only resolves PFCC or Fellowship layers. The API validates those kinds and lets only Pastor + PFCCManager create sub-campaigns. Approval is `CellLeader → FellowshipLeader → PFCCManager → Pastor`, with a `ChurchHasPfccManagers` skip. `GivingProgramScopeNodes` already stores multi-node (fellowship-group) scope. Overall givings columns already follow `getLayers(tree)` — reuse that pattern.

## Goals / Non-Goals

**Goals:**

- One `givingScopePolicy(tree, parent, actor)` manager: church-wide allowed, layers, units, multi-select, who may create / bulk-log, labels from `displayName` and leadership profile.
- Persist church-wide **or** one node **or** many same-layer nodes. Create requests may omit PFCC/Fellowship kind; the server derives storage from the nodes.
- Create campaign and add sub-campaign are one form each; both read the manager.
- Approval hop and create/bulk-log rights use leadership + “does this church have that layer’s leaders,” not named-role `if`s in screens.
- Lock two templates in tests: PFCC → Fellowship → Cell, and Fellowship → Cell (or Church → Cell).

**Non-Goals:**

- Rewriting attendance meeting-type scope (shares the enum; keep old values so attendance still compiles).
- Redesigning remittance Settings / payment numbers.
- Changing dual-giving, recurring batch math, or overall-givings column catalog (already template-aware).
- Migrating historical `ScopeKind` strings off existing rows.

## Decisions

1. **Volatility split: manager vs engine**  
   What you may attach to changes per church. The form (name, dates, pick units) does not. Same split as `createUnitPolicy`.  
   *Alt:* Hide missing chips in the wizard — still cannot scope to Cell/Group; API still rejects.

2. **Nodes are the source of truth**  
   - Church-wide: no node ids, stored kind `ChurchWide`.  
   - One unit: `ScopeNodeId` (+ `GivingProgramScopeNodes` optional).  
   - Several units: `GivingProgramScopeNodes`, all same layer.  
   Client sends `scopeNodeId` / `scopeNodeIds` (empty = church-wide when allowed). Server sets `ScopeKind` for compatibility: keep writing `PFCC` / `Fellowship` / `FellowshipGroup` when the layer `standardType` matches; otherwise write a generic stored kind (`Unit` / `UnitGroup`) **or** treat “any non-church-wide + node list” as sufficient and stop requiring kind for validation. Prefer adding `Unit` and `UnitGroup` to the enum so attendance and old rows stay on the four legacy values.  
   *Alt:* New `scopeLayerId` column — extra migration; node already implies layer.

3. **Policy keys off leadership profile + template position**  
   `me.leadershipProfile` / `LayerLeadershipProfiles` already maps Pastor/ChurchAdmin → churchWide, PFCC/Fellowship (and Group) → intermediate, Cell → leaf.  
   - Church-wide: may choose church-wide or any layer; may create main + sub.  
   - Intermediate: may choose their unit and descendants (including deepest); may create main + sub inside that subtree; may bulk-log.  
   - Leaf: no create; single-member log only.  
   This **widens** today’s “only pastor + PFCC create subs” so a fellowship leader can add a Sunday under a campaign in their fellowship.  
   *Alt:* Keep PFCC-only sub-create — still a named-role gate.

4. **Approval hop walks leadership that exists**  
   Next approver = next profile above the enterer that this church actually staffs (has that layer’s leaders). Missing PFCC → skip to church-wide. Replace `ResolveContributionApprovingRoleAsync` / `ApplyAwaitingMyApprovalFilterAsync` role switches with that walk. Persist `pendingApproverRole` as today’s `ChurchRole` for the hop that exists so awaiting filters keep working.  
   *Alt:* New approver-profile column — bigger migration; not needed if we resolve at write time.

5. **One-form engines**  
   Drop Mode / Schedule / Scope / Review steppers. Compact chrome (`WizardStepper` dots optional, or none). Scope block is layer tabs or a layer select from the manager, then unit picker / multi-select. Recurring preview stays inline.  
   *Alt:* Two steps (details + scope) — still longer than asked.

6. **Legacy reads**  
   `GetProgramScopeNodeIdsAsync` already treats ChurchWide as empty and FellowshipGroup as the junction table; single-node kinds use `ScopeNodeId`. Keep that. New Unit/UnitGroup use the same paths.

## Risks / Trade-offs

- [Attendance still uses `ProgramScopeKind`] → Do not remove legacy enum values. Only add Unit/UnitGroup if needed; attendance create stays on the old four until its own change.
- [Fellowship leaders gain sub-create] → Spec it; cover with an API test. Product-approved in the proposal.
- [Member picker hid PFCC segments] → Stop filtering `standardType !== 'PFCC'`; show every template segment.
- [Hardcoded remittance copy] → Labels from the manager (“level above” / parent layer `displayName`), not “PFCC manager.”

## Migration Plan

Deploy API that accepts node-based create and still reads old kinds. Then ship the SPA. No backfill: existing rows stay. Rollback is revert; new Unit/UnitGroup values unused is harmless.

## Open Questions

None that block specs or tasks. Recurring batch already accepts `scopeKind` + nodes — same payload, derived kind.
