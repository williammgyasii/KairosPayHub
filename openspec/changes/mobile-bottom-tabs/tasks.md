## 1. Shared nav tree

- [x] 1.1 Extract `navForRole` and nav entry types from `app-sidebar.tsx` into `src/shared/lib/dashboard-nav.ts` with no behavior change. Verify the sidebar still renders the same destinations per role (existing sidebar tests, or a new snapshot of `navForRole` for church-manager / cell-leader / scoped / leader).
- [x] 1.2 Point `AppSidebar` at the extracted module. Verify `app-sidebar.tsx` no longer owns the role trees.

## 2. Tab manager (TDD)

- [x] 2.1 Add failing tests for `createMobileTabs`: church-manager tree → Home, Attendance, Givings, Roster, More with Structure/Settings in overflow; cell-leader tree → Roster only if present, never Structure as a primary tab; no-Roster leader → no Roster tab; nested `/attendance/overview` marks Attendance active; `/settings` marks More active. Verify they fail.
- [x] 2.2 Implement `createMobileTabs` (pure). Verify the tests in 2.1 pass. No JSX, no `role ===` / `standardType ===` in the manager.

## 3. Tab bar engine

- [x] 3.1 Add the bottom tab bar + More sheet that render `createMobileTabs` output and navigate existing routes. Verify a component test: tapping Attendance goes to that role’s landing; tapping More lists overflow only; choosing Settings navigates and closes the sheet.
- [x] 3.2 Mount the bar in the dashboard layout below `lg`, add safe-area + main bottom padding, and hide the topbar hamburger on that range. Verify desktop (`lg+`) still shows the sidebar and no tab bar; phone viewport shows tabs and no hamburger.

## 4. Smoke

- [ ] 4.1 Restart API + frontend. On the iPhone simulator at `http://127.0.0.1:5173`, walk Home → Attendance → Givings → More → Settings as a pastor and as a cell leader. Verify last-page content clears the tab bar and the desktop window is unchanged.
