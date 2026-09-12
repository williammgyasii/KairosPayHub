## 1. Manager

- [x] 1.1 Add `phoneListCard` tests (title + two lines, empty values become em dash in details, extra lines dropped) and verify they fail
- [x] 1.2 Implement `phoneListCard` and verify those tests pass
- [x] 1.3 Add `isPhoneListViewport` tests for 767 vs 768 and verify the helper matches Tailwind `md`

## 2. Engine

- [x] 2.1 Add PhoneList tests: cards render on phone, table slot hidden; tap card opens details modal with all detail pairs; actions slot does not open the modal
- [x] 2.2 Implement PhoneList + details modal (reuse `Modal`) and verify engine tests pass

## 3. Roster

- [x] 3.1 Wire Membership (`structure-member-table`) and verify phone cards + details include omitted profile columns
- [x] 3.2 Wire Units (`structure-unit-node-table`) and verify name / parent / members on the card and in details
- [x] 3.3 Membership phone list opts into `PhoneList` flush: no nested cards, New on the bottom row (light / squared), `tel:` on the number without opening details; Units stay on cards

## 4. Attendance

- [x] 4.1 Wire All attendance and by-units tables and verify cards show name + unit + type
- [x] 4.2 Wire Approvals queue and verify card tap opens the existing review modal (not a column dump)

## 5. Giving

- [x] 5.1 Wire overall / rankings / campaign / history / structure / ledger / sub-campaign / member-givings tables and verify each has cards + details (or existing contribution detail on tap)

## 6. Verify

- [x] 6.1 Run frontend unit tests and verify they pass
- [ ] 6.2 Smoke Membership and one Giving list at phone width in the browser and verify no horizontal row scroll
