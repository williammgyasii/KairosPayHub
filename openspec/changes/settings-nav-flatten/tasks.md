## 1. Specs & tests first

- [x] 1.1 Add frontend tests for flat Settings tabs by role (managers vs others) and active routes
- [x] 1.2 Add frontend tests for `/account` → `/settings/profile` (and security/notifications) redirects
- [x] 1.3 Add/extend Church profile tests: logo preview from `churchLogoUrl`, upload success refreshes preview (mock fetch), error path

## 2. Navigation & routes

- [x] 2.1 Update `SettingsTabs` to flat labels/routes; remove nested `AccountTabs` usage
- [x] 2.2 Put Profile / Security / Notifications under `SettingsLayout` in `App.tsx`; add legacy redirects
- [x] 2.3 Allow non–church-managers to use Settings layout (or equivalent) for the three personal tabs only
- [x] 2.4 Update headers/copy (“Settings”) and any sidebar links pointing at `/account`

## 3. Church profile UI

- [x] 3.1 Rename Branding page/surface to Church profile; avatar-style logo preview matching sidebar mark
- [x] 3.2 Wire upload + `reloadMe`; clear errors; optional display cache-bust
- [x] 3.3 Delete or stop shipping dead nested account-tab UI if unused

## 4. Verify

- [x] 4.1 Run frontend tests/build; smoke Settings as pastor and as non-manager
- [x] 4.2 Mark tasks complete; restart local dev servers
