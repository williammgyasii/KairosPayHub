## Context

See proposal.md for why. AbilityResolver + LayerLeadershipProfiles already map role / layer kind → product abilities and pack CASL rules onto `/me`. ChurchAdmin shares the church-wide profile with Pastor (`canManageChurch`). Create-node still calls `RequireChurchManager`. Roster sets `readOnly = !canManageChurch`, which hides Add for every non-pastor.

`structure-aware-abilities` already said church overlays are data later. This change is that store plus the pastor UI. Settings → Administrators stays the people list.

## Goals / Non-Goals

**Goals:**

- Overlay table keyed by church + subject (template layer id, administrator profile, or named admin user id) + ability id.
- Resolver: defaults → administrator profile (if ChurchAdmin) → named admin (if any) → never above catalog, never grant `manageChurch` / template `manageStructure` via overlay.
- Create-node and roster Add use `createChildUnits` + immediate-child + subtree, same manager on API and FE.
- `/access` and sidebar item for `role === Pastor` only (`isPastor`, not `canManageChurch`).

**Non-Goals:**

- Per-member or per-unit exceptions.
- Permission editor for the platform operator / host database.
- CASL subject redesign; add `createChildUnits` → pack rule `create` / `ChildUnit` (or equivalent) in the existing mapping module.
- Letting ChurchAdmin edit Access.

## Decisions

1. **Overlays, not a blank matrix**  
   GET Access returns rows with `defaultOn` + `effectiveOn` + `locked` (leaf create-child-units, pastor-only abilities). PUT sends only diffs from default (or full effective map; server stores diffs).  
   *Alt:* store every cell — noisier migrations when the catalog grows.

2. **New ability `createChildUnits`**  
   Default on for church-wide and intermediate, off and locked for leaf. Pastor keeps it even if they turn the administrator profile off.  
   *Alt:* reuse `manageStructure` — that verb already means template evolve / church-wide org chart. Do not overload it.

3. **Immediate child only**  
   Scoped actor may create only `directChildLayer(scopeNode)`. Parent must be the scope node or a descendant that is a valid parent for that child layer. Pastor/admin with the ability may still create any layer (today’s manager behavior).  
   *Alt:* any descendant layer — deferred; would let a Zone plant cells and skip District.

4. **Administrator subjects**  
   Subject kinds: `layer`, `adminProfile`, `adminUser`. Named admin effective = default church-wide ∩ adminProfile ∩ adminUser (AND; only further restriction). Reject PUT that turns a named-admin ability on when the profile is off.  
   *Alt:* named admin only, no profile row — pastor would retoggle every admin.

5. **Pastor-only editor**  
   API: `ChurchRole.Pastor` (not `CanManageChurch`). FE: `isPastor` for nav + `PastorRoute` on `/access`. ChurchAdmin hitting the API gets 403.  
   *Alt:* any church manager — then an admin can restore their own powers.

6. **Roster readOnly split**  
   Keep structure *edit/delete/change-leader* gated on church-wide (or later overlays). Add uses create-child-units. Do not set the whole `RosterUnitView` to `readOnly` for scoped leaders.  
   Manager: extend `createUnitPolicy` (or a sibling `canCreateUnit(actor, tree, layer, parentId)`) with actor abilities + scope. Screens do not check `FellowshipLeader`.

7. **Page placement**  
   Sidebar item “Access” at `/access`, near Settings. Not a Settings tab (settings-nav-flatten stays). Icon: existing `ShieldCheck` or similar already in the sidebar file.

8. **Category headings, same catalog**  
   Access is a subject sidebar (template layers, then Administrators / named admins) plus one detail pane. The pane groups Units / Roster / Records. A manager maps ability ids → category. Roster stays one fat (`manageRoster` → CASL `manage` / `Roster`). Records stays the six giving abilities. Do not invent a second permission system, a Giving ladder, or a spreadsheet. Unknown ids fall into Other so a new catalog entry cannot silently vanish.

## Risks / Trade-offs

- [ChurchAdmin today equals pastor] → Default admin profile stays church-wide; nothing changes until the pastor saves. Tests must lock “admin cannot open Access.”
- [createChildUnits default on surprises churches that liked pastor-only create] → Default matches the client ask; pastor can turn the mid-layer column off in one save.
- [Dual gate during migrate] → Create-node drops `RequireChurchManager` only after ability + scope tests exist; FE Add follows the same tests.
- [Overlay vs `/me` cache] → Invalidate session / refetch `me` after PUT Access so Jane’s next load drops the ability.

## Migration Plan

1. Add `createChildUnits` to the catalog and defaults (intermediate + church-wide).
2. Ship overlay table empty = defaults. No backfill.
3. Switch create-node and roster Add to the new check.
4. Ship `/access` pastor-only.
5. Rollback: ignore overlay rows and restore `RequireChurchManager` if needed; empty table is a no-op.

## Open Questions

- None that change the spec. Per-unit exceptions stay a later change.
