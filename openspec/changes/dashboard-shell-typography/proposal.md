## Why

The dashboard shell feels typographically uneven (ad-hoc `text-[10px]` / `text-[11px]` / `text-xs` mix) and the sticky topbar packs church identity, role badge, notifications, and account into one cramped row—especially on phone and tablet. Responsive layout is acceptable; consistency and breathing room are not.

## What Changes

- Establish a small dashboard type scale (page title, section title, body, muted meta / eyebrow) and apply it to shell chrome and shared page headers first.
- Keep the existing system UI font stack (no new webfont) so the product still “looks like itself”; consistency comes from shared sizes/roles.
- Redesign the dashboard topbar for clearer clusters and less density: taller bar, more gap between identity vs actions, hide the in-bar role badge on narrow viewports (role remains in the account menu).
- Align `DashboardPageHeader` and topbar labels with the shared scale (no one-off pixel sizes in those surfaces).

## Capabilities

### New Capabilities

- `dashboard/shell-typography`: Dashboard shell type scale, font family, and topbar spacing/identity rules.

### Modified Capabilities

- (none)

## Impact

- Frontend only: `index.css` / `index.html`, `dashboard-topbar.tsx`, `dashboard-page-header.tsx`, related layout helpers/tests.
- No API or auth changes.
- Broader page content (tables, wizards) may keep existing sizes until a follow-up; this change sets the contract and applies it to shell + page headers.
