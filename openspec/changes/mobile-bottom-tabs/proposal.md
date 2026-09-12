## Why

On a phone the signed-in shell still uses a desktop sidebar behind a hamburger. Thumb reach is at the top, every destination is equally buried, and a soldier and a pastor see the same chrome shape. The app is now installable; phone chrome should match how people actually move (Attendance, Givings, Home) without changing routes or abilities.

## What Changes

- Below the existing sidebar breakpoint (`lg`), replace the hamburger-first chrome with a persistent bottom tab bar.
- Tab *set* and each tab’s landing path come from a manager (abilities + existing nav trees). No `role ===` / `standardType ===` gates in the tab bar.
- At most five tabs. Destinations that do not fit (Structure, Events, Access, Settings, extra Attendance/Givings children) stay reachable from a **More** sheet — the same destinations the sidebar already shows that role.
- Desktop (`lg` and up) keeps the current sidebar. Routes, abilities, and page engines stay the same.
- Bell stays in the topbar (existing inbox + unread). Account / You stays in the topbar menu. No Capacitor, no new native shell.

## Capabilities

### New Capabilities

- `dashboard/mobile-nav`: Phone/tablet bottom tabs + More overflow; desktop sidebar unchanged.

### Modified Capabilities

- (none)

## Impact

- Frontend only: dashboard layout, sidebar/topbar chrome, a new `features/` or `shared/layout` manager + tab engine, unit tests for pastor vs cell-leader tab sets.
- No API, schema, Web Push, or route changes.
- Overlaps `phone-table-cards` (list shape) and `dashboard-shell-typography` (type scale) only as consumers — those contracts stay.
