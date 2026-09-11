## Context

Membership already toggles via a pure helper (`membership-table-columns.ts`) and session state. Attendance Who-showed-up uses in-memory defaults. Giving overall/campaign persist in `localStorage`. Units (`roster-view` `RosterDataTable`) has no Columns control. See proposal.md for why. There is no user-preferences table yet. `/api/me` is already the account surface (`MeController` + sibling services such as `UserAvatarService`).

## Goals / Non-Goals

**Goals**

- One `user_table_preferences` row per `(AuthUserId, Key)` with a JSON column map.
- Thin me endpoints; merge/defaults stay in a small service + existing FE column helpers.
- Units Columns reuses `ColumnToggleSwitch` / toolbar pattern from Membership.

**Non-Goals**

- Church-scoped or member-id keys.
- Column order, widths, or Attendance By-unit columns.
- Stuffing maps onto `GET /api/me`.

## Decisions

1. **Generic keyed table, not one row per column** — upsert a whole map per key. Alternative (normalized bool rows) makes merge and “replace this table’s prefs” noisy.

2. **Own the row by Identity `AuthUserId` (`current.Sub`)** — same as avatar. Works for anyone signed in, including people without a roster row. Alternative (member id) would drop prefs if the login is not on the roster.

3. **Sibling service + me routes, not a fatter `/me` DTO** — `GET /api/me/table-preferences` → `{ preferences: { [key]: { [columnId]: bool } } }`; `PUT /api/me/table-preferences/{key}` body `{ columns: { ... } }`. Keep `MeController` from growing another concern, or a tiny `MeTablePreferencesController` under `api/me` if the existing controller is already large. Alternative (embed on `/me`) mixes auth payload with UI chrome.

4. **Allow-list keys in the service** — the five keys from the spec. Unknown key → 400. Always-on ids (`name`, `member`, `actions`) forced true on save.

5. **Merge is a manager** — FE helpers already merge membership/giving/attendance defaults. Add a tiny `units-table-columns.ts` (ids, labels, defaults). Shared `mergeColumnVisibility(defaults, saved)` if it stays table-agnostic. New column ids take the default until toggled.

6. **Giving one-time localStorage promote** — if GET has no giving key and `localStorage` has a v3 map, PUT that map once, then stop writing localStorage. Alternative (keep both forever) drifts.

7. **Debounced PUT** — toggle updates local React state immediately; persist ~300ms after the last toggle for that key so five clicks are one write. Last write wins.

## Risks / Trade-offs

- [Two tabs race] → last PUT wins; acceptable for v1.
- [MeController size] → extract `UserTablePreferenceService`; do not append a god method pile onto me.
- [Giving localStorage leftover] → after successful PUT, remove that storage key so the browser copy cannot override later.

## Migration Plan

- EF migration for `user_table_preferences` on **dev** (`kairospayhub_dev`) only unless the user names production.
- No backfill. Empty rows mean defaults.
- Frontend: tests for merge + Units Columns, then API tests, then wire tables.
