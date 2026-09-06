## Context

Today `ChurchRole` (`Pastor`, `ChurchAdmin`, `PFCCManager`, `FellowshipLeader`, `CellLeader`, `Member`) and helpers like `isScopedLeader` / `canViewMemberGivings` gate the SPA. Structure templates already allow custom **display names**, but leadership and permissions still assume the fixed role enum. Churches with Zones / Districts / Home groups hit that wall.

Stack: .NET API + React. Auth is JWT (Bearer), not cookies. Scope resolution already exists for contributions/member-totals via structure subtree.

## Goals / Non-Goals

**Goals:**
- One scalable model: **abilities** (product) + **node leadership** (structure) + **CASL on the client** (UX gates).
- API packs rules; frontend never feature-gates on role string equality.
- Default layer leadership profiles preserve today’s access after migration.
- Flexible layer labels for demos/onboarding of differently structured churches.

**Non-Goals:**
- Per-church freeform “invent any permission string in a matrix UI” in v1 of this change (profiles are system defaults + optional church overrides later as data — defaults ship now).
- Replacing JWT with cookie sessions.
- Rewriting every screen in one PR — framework + giving/member-givings primary gates first; remaining role checks migrate on the same pattern in this change’s task list until critical paths are clean.

## Locked architecture (do not revisit before implement)

```text
StructureTemplate (ordered layers + labels + layerKind for defaults)
        │
        ▼
RoleAssignment / Leadership → scopeNodeId + layerKind profile
        │
        ▼
AbilityResolver (API) → abilities[] + packRules(CASL)
        │
        ├─► Enforce on every sensitive endpoint (existing scope services)
        └─► /api/me → frontend AbilityProvider → ability.can(...)
```

1. **Abilities are the product language** — stable identifiers for features.
2. **Structure leadership is node + layer profile** — not `role === 'FellowshipLeader'` in UI.
3. **CASL is the SPA adapter** — rules come from API (`packRules` / documented JSON). Do not re-derive rules from role names in React.
4. **Server remains authoritative** — abilities on `/me` are for UX consistency; APIs still enforce.

## Decisions

1. **Ability catalog (initial)**  
   Start with the set needed for current product surfaces, e.g.:  
   `manageChurch`, `manageStructure`, `viewMemberGivings`, `approveGiving`, `logGiving`, `createCampaign`, `createSubCampaign`, `viewOverallGivings`, `manageRoster`.  
   Extend catalog in code/constants — not ad-hoc strings in components.

2. **Layer leadership profiles**  
   Map `layerKind` (or depth: root-adjacent / intermediate / leaf) → default ability sets.  
   Migrate: `Pastor`/`ChurchAdmin` → church-wide manager abilities; `PFCCManager`/`FellowshipLeader` → intermediate profile + scope node; `CellLeader` → leaf profile + scope node.

3. **CASL on frontend**  
   `@casl/ability` + `@casl/react`. `AbilityProvider` from packed rules on `/me`. Prefer `Can` / `ability.can('view', 'MemberGivings')` subjects that mirror abilities (document mapping once in `lib/abilities`).

4. **`ChurchRole` on `/me`**  
   Keep temporarily for display badges and migration debugging; **forbidden** for new feature gates. Remove from gate sites as tasks complete.

5. **Template flexibility**  
   Churches may use N layers with custom labels. Internal `layerKind` (or sort-order policy) selects the default profile. Labels never appear in permission code.

6. **.NET side**  
   No CASL.NET required. Ability resolution is a C# service returning string abilities + optional packed rule DTO for the SPA. Enforcement stays in existing scope/auth services, optionally checking ability enums server-side for clarity.

## Risks / Trade-offs

- [Migration bugs for scoped leaders] → Integration tests per legacy role → expected abilities + scope.  
- [Dual gate during migration] → Task list forbids new role-string gates; grep CI optional.  
- [Over-building church permission editor] → Ship defaults only; schema allows future overrides without redesign.  
- [CASL subject naming drift] → Single mapping module; specs name abilities, design names CASL subjects.

## Migration Plan

1. Ship AbilityResolver + `/me` fields alongside existing `role`.  
2. Teach SPA AbilityProvider; switch Member givings / key giving gates.  
3. Migrate remaining frontend gates; keep API role checks until ability checks mirror them.  
4. Backfill/normalize assignments so scopeNodeId + layerKind are always present for leaders.  
5. Document for demos: configure layers by label; assign leaders to nodes; abilities follow.

## Migration notes

- `/api/me` still returns legacy `role` for display badges and migration debugging.
- Feature gates must use `abilities` / `abilityRules` (CASL) or helpers that prefer abilities (`canViewMemberGivings(me)`, etc.).
- Role-string equality in new feature gates is forbidden; remaining role helpers are compatibility fallbacks when abilities are absent.
