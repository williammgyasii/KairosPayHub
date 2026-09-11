## 1. Ability catalog

- [x] 1.1 Add `createChildUnits` to the product ability catalog and pack it as a CASL rule. Verify AbilityResolver tests: church-wide and intermediate include it; leaf does not.
- [x] 1.2 Add frontend ability helper + pack/unpack test for `createChildUnits` (no role-name checks). Verify the unit test passes.

## 2. Overlay store and resolver

- [x] 2.1 Add failing API tests: empty overlays leave defaults; layer overlay turns an ability off for leaders of that layer; admin profile overlay applies to every ChurchAdmin; named admin can only further restrict; pastor abilities ignore overlays. Verify they fail.
- [x] 2.2 Persist overlays (church + subject kind/id + ability) and apply them in AbilityResolver after defaults. Verify the tests in 2.1 pass. Pastor `/me` is unchanged by admin overlays.

## 3. Access API (pastor only)

- [x] 3.1 Add failing API tests: Pastor GET returns layer rows (display names), Administrators row, and a row per active admin with defaultOn / effectiveOn / locked; Pastor PUT saves diffs; ChurchAdmin GET/PUT is 403; named-admin on-above-profile is 400. Verify they fail.
- [x] 3.2 Implement pastor-only Access GET/PUT. Verify the tests in 3.1 pass.

## 4. Create-node authorization

- [x] 4.1 Add failing API tests: intermediate leader with create-child-units creates an immediate-child unit in scope; same leader cannot create on their own layer or outside scope; overlay off rejects create; pastor can still create any layer. Verify they fail.
- [x] 4.2 Replace `RequireChurchManager` on create-node with create-child-units + immediate-child + subtree. Verify the tests in 4.1 pass.

## 5. Roster Add

- [x] 5.1 Extend create-unit policy (or sibling manager) with actor abilities and scope. Add failing frontend tests: mid-layer leader sees Add on the child tab; not on their own layer; overlay off hides Add; pastor still sees Add. Verify they fail.
- [x] 5.2 Stop gating the Add button on `canManageChurch` / full-page `readOnly`. Keep edit/delete/change-leader on church-wide. Verify the tests in 5.1 pass.

## 6. Access page and sidebar

- [x] 6.1 Add `/access` behind Pastor-only route (not `canManageChurch`). Add failing nav tests: Pastor sees Access; ChurchAdmin and fellowship leader do not; `/access` as admin does not show the grid. Verify they fail.
- [x] 6.2 Build the Access grid from GET (layer labels, Administrators, named admins, locked leaf create-child-units). Wire PUT and refetch `/me`. Verify pastor can save a mid-layer off and an admin further restriction; admin cannot open the page.
- [x] 6.3 Group Access columns under Units / Roster / Records via a category manager (ability id → heading). Roster is one fat; Records is the six giving abilities. Verify the manager and Access page tests.

## 7. Verify

- [x] 7.1 Run AbilityResolver, Access API, create-node, policy, and sidebar tests. Restart local API and frontend.
- [ ] 7.2 Smoke on **dev**: as pastor, confirm Access in the sidebar; turn create-child-units on for the mid-layer if needed; as that fellowship leader, Add cell appears under their fellowship and save creates one cell. As ChurchAdmin, Access is absent.
- [x] 7.3 Scoped Units table keeps the parent unit name after subtree filter (ancestors for labels only).
