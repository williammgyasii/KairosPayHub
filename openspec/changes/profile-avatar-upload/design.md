## Context

Church logo already uses `POST /api/church/logo` → `IObjectStorage` (R2) → `Church.LogoUrl` → `me.churchLogoUrl`. Personal avatars need the same pattern on the Identity user so external church admins (no roster row) can still set a photo.

## Goals / Non-Goals

**Goals**

- `ApplicationUser.AvatarUrl` + `POST /api/me/avatar` for any authenticated user.
- `GET /api/me` exposes `avatarUrl`.
- Profile page upload/replace UI; topbar consumes the same field.

**Non-Goals**

- Remove avatar (back to initials only).
- Cropper UI.
- Showing personal avatars on roster / member pages.
- Syncing avatar onto `church_members`.

## Decisions

1. **Store on Identity user** — `AvatarUrl` on `ApplicationUser`, not the member row, so “anyone signed in” works.
2. **Mirror church logo constraints** — JPEG/PNG/WebP, max 2 MB, object key `users/{userId}/avatar.{ext}`.
3. **Replace overwrites the same logical key** — upload again updates `AvatarUrl`; no DELETE endpoint in v1.
4. **UI** — small avatar section at top of Profile (always editable for avatar even when profile fields are read-only); cache-bust display URL after upload like church logo.
5. **Service** — dedicated `UserAvatarService` (keep `MeController` thin; avoid growing branding into me).

## Risks / Trade-offs

- R2 must be configured in each environment or uploads return 503 (same as church logo).
- Object keys per extension: switching PNG→JPEG may leave an unused previous object (acceptable for v1).

## Migration Plan

- EF migration adding nullable `AvatarUrl` on AspNetUsers / ApplicationUser.
- Frontend: add `avatarUrl` to `Me`; wire Profile + topbar; tests first then implement.
