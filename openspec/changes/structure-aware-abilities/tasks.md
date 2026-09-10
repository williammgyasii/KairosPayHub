## 1. API ability model

- [x] 1.1 Define ability catalog constants + DTO fields on session/`/me` (`abilities`, packed rules, scope)
- [x] 1.2 Implement AbilityResolver from RoleAssignment + layerKind defaults; cover Pastor/Admin/PFCC/Fellowship/Cell → abilities
- [x] 1.3 Integration tests: each legacy role receives expected abilities and scope; member does not get manage abilities
- [x] 1.4 Ensure sensitive giving/structure endpoints still enforce server-side (ability optional extra check; scope mandatory)

## 2. Structure / layer leadership

- [x] 2.1 Document/encode default layer leadership profiles (intermediate vs leaf vs church-wide)
- [x] 2.2 Ensure leader assignments resolve via `scopeNodeId` + layer profile (migrate any gaps)
- [x] 2.3 Template/onboarding copy or validation: labels are free; kinds/profiles drive defaults
- [x] 2.4 Tests: renamed leaf label still yields leaf profile abilities for that node’s leader

## 3. Frontend CASL

- [x] 3.1 Add `@casl/ability` + `@casl/react`; AbilityProvider fed from `/me` packed rules
- [x] 3.2 Map abilities → CASL actions/subjects in one module; unit tests for pack/unpack
- [x] 3.3 Replace Member givings gate (`canViewMemberGivings` / role checks) with `ability.can(...)`
- [x] 3.4 Replace remaining critical giving/nav gates that use role string equality with abilities (grep and clear)

## 4. Verify

- [x] 4.1 Cell leader + fellowship/mid-layer leader + pastor smoke: Member givings / campaigns without role-name UI checks
- [x] 4.2 Restart dev servers; confirm `/me` payload includes abilities + rules
- [x] 4.3 Mark migration notes in change design if any legacy role field remains display-only

## 5. Roster writes follow manageRoster

- [x] 5.1 Add failing tests: `canManageMembers` follows `manageRoster` (leaf fallback true); cell leader `POST` in-scope succeeds and out-of-scope is 403
- [x] 5.2 `RequireMemberManageAsync` authorizes via node scope access, not `IsScopedStructureLeader`
- [x] 5.3 Membership and unit Members pages gate Add member with `canManageMembers(me)`, not `me.role`
