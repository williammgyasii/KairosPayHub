## Why

People on the roster with a login (cell leaders, later members) open Account and see a read-only name/email/role dump. Birthday, phone, and work already live on their `church_members` row and show on the roster, member page, and calendar — they just cannot edit that row themselves. Account also piles profile, notifications, and security on one page.

## What Changes

- A signed-in person who has a linked roster row can edit their own profile from Account: name, phone, date of birth, residence, occupation, school/workplace.
- Email, role, church, and unit stay read-only on Account. Changing unit remains a roster move.
- `GET /api/me` includes those profile fields. `PATCH /api/me` writes the linked `church_members` row so every surface that already reads members stays in sync.
- Account splits into separate pages: Profile, Security, Notifications (notifications stay a placeholder).
- No pastor-only profile store. If there is no linked member row, Account stays read-only and PATCH is rejected.

## Capabilities

### New Capabilities

- `account/self-profile`: self-serve Account profile edit, me DTO profile fields, and Account page split (profile / security / notifications).

### Modified Capabilities

- (none — no archived account spec yet)

## Impact

- API: `MeController` GET shape + new `PATCH /api/me`; member row + `ApplicationUser.DisplayName` for name.
- Frontend: `/account` becomes Profile; add `/account/security` and `/account/notifications`; reuse `MemberProfileFields`.
- Tests: API integration (cell leader PATCH, email ignored, no-member 400, roster sees new birthday); frontend Account page tests.
