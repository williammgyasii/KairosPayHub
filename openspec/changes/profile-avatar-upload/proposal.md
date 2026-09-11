## Why

Signed-in users only see initials in the topbar and have no way to set a personal photo on Profile. People expect to upload and replace their own avatar the same way church managers set the church logo.

## What Changes

- Any signed-in user can upload or replace a personal avatar from Settings → Profile.
- Avatar appears on the Profile page preview and in the topbar user menu.
- `GET /api/me` includes `avatarUrl`; `POST /api/me/avatar` stores the image (R2) on the Identity user.
- No remove-to-initials in this change (replace only). No roster/member card surfaces.

## Capabilities

### New Capabilities

- `account/avatar`: personal avatar upload/replace, me DTO field, Profile + topbar display.

### Modified Capabilities

- (none)

## Impact

- API: `ApplicationUser.AvatarUrl`, migration, avatar upload service, `MeController` GET + POST avatar.
- Frontend: Profile avatar control, `me.avatarUrl`, topbar `AvatarImage`.
- Storage: reuse `IObjectStorage` / R2 like church logo (JPEG/PNG/WebP, max 2 MB).
- Tests: API integration + Profile/topbar frontend tests.
