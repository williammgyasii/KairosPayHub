## Purpose

Defines personal avatar upload and display for any signed-in user on Profile and in the topbar user menu.

## ADDED Requirements

### Requirement: Avatar on Profile and topbar

A signed-in user’s personal avatar SHALL be editable from Settings → Profile and SHALL appear in the topbar user menu. When no avatar is set, initials SHALL be shown.

#### Scenario: Profile shows avatar controls

- **WHEN** a signed-in user opens Settings → Profile
- **THEN** the page shows an avatar preview (image or initials)
- **AND** an Upload or Change control is available

#### Scenario: Topbar uses the same avatar

- **WHEN** the user has an `avatarUrl` on `me`
- **THEN** the topbar user menu trigger shows that image
- **AND** when `avatarUrl` is null, the topbar shows initials

### Requirement: Upload and replace

Any authenticated user SHALL be able to upload a new avatar or replace an existing one via `POST /api/me/avatar`. Supported types are JPEG, PNG, and WebP up to 2 MB. Successful upload SHALL update `ApplicationUser.AvatarUrl` and return the public URL; subsequent `GET /api/me` SHALL include that `avatarUrl`.

#### Scenario: Successful upload

- **WHEN** a signed-in user posts a valid image to `POST /api/me/avatar`
- **THEN** the response includes the avatar URL
- **AND** `GET /api/me` returns the same URL as `avatarUrl`

#### Scenario: Replace keeps a single current URL

- **WHEN** a signed-in user uploads a second valid avatar
- **THEN** `GET /api/me` returns the new `avatarUrl`
- **AND** Profile and topbar show the new image after refresh

#### Scenario: Invalid file rejected

- **WHEN** the upload is missing, wrong type, or over 2 MB
- **THEN** the API returns 400 with an error message
- **AND** `avatarUrl` is unchanged

#### Scenario: Storage not configured

- **WHEN** object storage is not configured
- **THEN** the API returns 503 indicating storage is not configured
