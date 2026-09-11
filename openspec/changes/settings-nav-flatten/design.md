## Context

See proposal.md — Why. Today `SettingsLayout` (PastorRoute) hosts Branding + Administrators; `AccountLayout` hosts Profile / Security / Notifications with a nested `AccountTabs` row and optionally duplicates `SettingsTabs` for managers. Logo upload already uses `POST /api/church/logo` → R2 → `Church.LogoUrl` → `me.churchLogoUrl` → `ChurchBrand` in the sidebar.

## Goals / Non-Goals

**Goals:**
- One Settings shell and one tab bar for all roles (role-filtered tabs).
- Routes under `/settings/*` with redirects from `/account/*`.
- Church profile page with avatar-style logo preview + upload that refreshes `me`.

**Non-Goals:**
- Editing church name, country, currency, or timezone on this page.
- Putting the church logo into the personal user-menu avatar.
- Changing R2 bucket layout beyond optional cache-bust query on the returned URL if needed.

## Decisions

1. **Unify under `SettingsLayout`**  
   Move profile/security/notifications routes under `/settings`. Guard Church profile + Administrators with church-manager checks (page or route). Non-managers use the same layout with a shorter tab list.  
   *Alternative considered:* keep `/account/*` URLs — rejected to avoid dual layouts.

2. **Tab labels**  
   Church profile | Profile | Security | Notifications | Administrators (managers). Personal tab stays “Profile” (not “My profile”) per product agreement.

3. **Logo preview component**  
   Extract or reuse avatar-only presentation from `ChurchBrand` (e.g. `logoOnly` / dedicated preview) so Settings does not embed the full sidebar chip.

4. **Upload path**  
   Keep `POST /api/church/logo`. Prefer clearer client error mapping for 503 storage-not-configured. Append a cache-buster (`?v=timestamp`) on display after upload if the object key is stable.

## Risks / Trade-offs

- [Stale bookmarks to `/account`] → Permanent redirects in the router.  
- [Managers lose nested Account chrome] → Intentional; one bar is the product goal.  
- [R2 unset locally] → Surface server error string; no fake success.

## Migration Plan

Ship FE redirects with the deploy. No DB migration. Rollback = revert FE route/tab changes.
