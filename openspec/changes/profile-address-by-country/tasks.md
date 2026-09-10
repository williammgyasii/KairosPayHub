## 1. Address manager

- [x] 1.1 Add failing tests for `profileAddressPolicy`: US → `showState`, label Home address, 50 states + DC; GH → no state, label Residence / location; verify tests fail
- [x] 1.2 Implement `profileAddressPolicy(countryCode)` with US state options; verify manager tests pass with no country checks in screens

## 2. Shared profile fields

- [x] 2.1 Add failing tests: `isRequiredLeaderProfileComplete` needs state when policy shows it; `memberProfilePayload` includes `state`; verify tests fail
- [x] 2.2 Wire `MemberProfileFields` to the manager (State select + residence label/placeholder); verify field/payload tests pass
- [x] 2.3 Student & working shows school + workplace; Unemployed persists as Unemployed with empty school/workplace

## 3. Create-unit leader step

- [x] 3.1 Add failing `UnitCreateWizard` tests: US church leader step shows State + Home address and blocks continue without state; GH shows Residence / location and no State; verify tests fail
- [x] 3.2 Pass church country into the leader step and include `state` on the new-leader payload; verify wizard tests pass

## 4. Persist state

- [x] 4.1 Add failing API test: create node with new leader `state` + `residence` returns both on the member; verify test fails
- [x] 4.2 Add optional `State` and `Workplace` on Member, DTOs, `ApplyMemberProfile`, and EF migration; verify API test passes

## 5. Verification

- [x] 5.1 Run frontend manager/wizard tests and API structure-node tests; restart local servers
- [ ] 5.2 Smoke US church: Add cell → leader step shows State + Home address; Ghana church still shows Residence / location
