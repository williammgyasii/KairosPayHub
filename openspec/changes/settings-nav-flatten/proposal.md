## Why

Pastor Settings nests Account under a second tab row (Profile / Security / Notifications), and Branding is a poorly arranged logo page that does not read as the same mark as the sidebar church avatar. Pastors need one flat settings bar and a Church profile surface that clearly owns the sidebar logo.

## What Changes

- Flatten Settings navigation into a single top-level tab bar.
- Rename Branding → **Church profile** (logo + church identity preview).
- Promote Profile, Security, and Notifications to top-level Settings tabs (no nested Account tabs).
- Keep Administrators as a top-level tab for church managers.
- Non–church-managers see only Profile | Security | Notifications under Settings (or Account shell with the same flat tabs).
- **BREAKING (URLs):** `/account`, `/account/security`, `/account/notifications` redirect to `/settings/profile`, `/settings/security`, `/settings/notifications`.
- Improve Church profile logo UX so upload updates the same `churchLogoUrl` shown in the sidebar avatar.

## Capabilities

### New Capabilities

- `settings/navigation`: Flat Settings tab model by role and redirect rules from legacy `/account` paths.
- `settings/church-profile`: Church logo preview/upload linked to the sidebar church mark.

### Modified Capabilities

- (none under `openspec/specs/` today)

## Impact

- Frontend: `settings-tabs`, `AccountLayout` / `SettingsLayout`, `App.tsx` routes, `SettingsBrandingPage` (Church profile), remove or stop using nested `AccountTabs`.
- API: existing `POST /api/church/logo` + `me.churchLogoUrl` remain the source of truth; fix UX/error handling and cache-bust if needed.
- Tests: settings/account route and branding upload/preview coverage.
