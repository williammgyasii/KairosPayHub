## Why

Membership detail UX is trapped in a side sheet with overlapping “records” vs “giving” actions. Pastors need full-page real estate for a member dashboard, attendance history, givings, and edit—plus a sticky name column on the roster so horizontal scroll stays usable on mobile.

## What Changes

- Replace sheet-first ⋮ actions with navigable member pages (profile, attendance, givings, edit) under `/roster/members/:memberId…`, with breadcrumbs.
- Add sticky (responsive) Name column on the membership roster table.
- Add `GET /api/attendance/members/{memberId}/history` (and summary metrics) so attendance page is real, not a placeholder.
- Wire Playwright e2e + API contract/integration coverage for the new routes and endpoint.
- Retire side sheet as the primary path for these actions (sheet may remain unused or for optional quick peek only).

## Capabilities

### New Capabilities

- `roster/member-detail-pages`: Member profile/attendance/givings/edit pages, roster sticky name, navigation from membership table.

### Modified Capabilities

- (none archived yet; attendance history API is part of this change’s design + roster capability scenarios)

## Impact

- API: Attendance controller/service + integration tests
- FE: routes, pages, membership table sticky + menu, Playwright
- Specs: `roster/member-detail-pages`
