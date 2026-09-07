## 1. Type foundation

- [x] 1.1 Keep the existing system UI font stack (no new webfont); verify body still uses the prior default family
- [x] 1.2 Add shared type-role utilities (`text-page-title`, `text-section-title`, `text-body`, `text-muted-body`, `text-eyebrow`) in `index.css` and verify classes resolve in CSS

## 2. Tests first

- [x] 2.1 Add failing topbar tests: no compact RoleBadge in the topbar header; role still appears in account menu; header uses taller bar / type roles — verify tests fail before implementation
- [x] 2.2 Add/adjust page-header test that title uses `text-page-title` — verify it fails or passes against intended markup

## 3. Shell UI

- [x] 3.1 Update `dashboard-topbar.tsx` for `h-16`, clearer clusters/gaps, remove compact in-bar RoleBadge, apply type roles; verify topbar tests pass
- [x] 3.2 Update `dashboard-page-header.tsx` (and topbar menu labels) to type roles; verify page-header test passes
- [x] 3.3 Spot-check overview/home titles that duplicate page chrome for obvious `text-[11px]` eyebrow → `text-eyebrow` where cheap; verify no regressions in related unit tests

## 4. Verify

- [x] 4.1 Run frontend unit tests for layout/header/topbar and confirm green
- [x] 4.2 Restart local API + frontend per project rules and confirm topbar looks spaced on a narrow viewport
