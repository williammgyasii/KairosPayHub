## 1. Me API

- [x] 1.1 Add failing integration tests: cell-leader `GET /api/me` includes profile fields; `PATCH /api/me` updates DOB/name/phone/work; email in the body is ignored; no linked member returns 400 and creates no row; verify tests fail
- [x] 1.2 Extend `GET /api/me` to load the linked `church_members` row (by church + AuthUserId) and return `memberId` plus profile fields; name prefers the member row; verify GET tests pass
- [x] 1.3 Implement `PATCH /api/me` writing those fields on the linked row and `ApplicationUser.DisplayName` for name; ignore email; reject when no row; verify PATCH tests pass

## 2. Account pages

- [x] 2.1 Add failing frontend tests: Account Profile shows editable roster fields when `memberId` is present, email is read-only, and nav links to Security and Notifications; verify tests fail
- [x] 2.2 Split routes to `/account` (profile), `/account/security`, `/account/notifications`; add Account sub-nav for every role; verify page tests pass
- [x] 2.3 Wire Profile save to `PATCH /api/me` via RTK mutation, reuse `MemberProfileFields`, invalidate `Me` + structure tags; verify save test and cell-leader smoke locally

## 3. Check

- [x] 3.1 Run the new API and frontend tests; confirm no `role === 'CellLeader'` gates on the Profile form
- [x] 3.2 Restart local servers and smoke: cell-leader Account edits birthday, roster/member page shows the same date
