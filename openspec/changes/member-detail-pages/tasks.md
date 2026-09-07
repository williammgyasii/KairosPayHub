## 1. Specs & API

- [x] 1.1 Add `GET /api/structure/members/{memberId}` and integration contract test; verify pass
- [x] 1.2 Add `GET /api/attendance/members/{memberId}/history` (+ summary) and integration contract test; verify pass

## 2. Roster sticky + navigation

- [x] 2.1 Sticky name column on membership table (responsive containment); unit/helper test if applicable
- [x] 2.2 Update ⋮ menu to navigate to profile/attendance/givings/edit routes; verify unit or Playwright

## 3. Pages

- [x] 3.1 Member profile, attendance, givings, edit pages with breadcrumbs + responsive layout
- [x] 3.2 Wire App routes; remove sheet as primary path from membership view

## 4. Verification

- [x] 4.1 Playwright e2e: login → membership → open profile/attendance/givings; assert no page overflow on mobile
- [x] 4.2 Run API integration tests for new endpoints; restart local servers
