## Context

See proposal.md for why. Today `navForRole` and the Attendance/Givings/Roster trees live inside `app-sidebar.tsx`. Desktop uses a collapsible sidebar; below `lg` a hamburger opens the same tree in a drawer (`dashboard-topbar.tsx` `lg:hidden`). Routes and abilities do not change.

`openspec/changes/pwa-web-push` still says the installed app must not show a bottom-tab shell. This change is the deliberate follow-up. When that change archives, update the “no bottom tabs” scenario so phone chrome is tabs and desktop stays sidebar.

## Goals / Non-Goals

**Goals:**

- One nav tree, two chrome engines (sidebar vs tabs + More).
- Tab *set* is a pure manager over that tree (max five, overflow in More).
- Same breakpoint as the sidebar (`lg`), so tablet-in-portrait gets tabs too.
- Safe-area padding so iPhone home indicator and last-row actions stay usable.

**Non-Goals:**

- Role-first Home (soldier → today’s roll). Dashboard page content stays.
- Bell / You as tabs.
- Capacitor, stores, or a second router.
- Redesigning list cards (`phone-table-cards`) or type scale (`dashboard-shell-typography`).
- Changing who can see Attendance, Givings, Events, Access.

## Decisions

### 1. Extract the nav tree; tabs consume it

**Choice:** Move `navForRole` / entry types / badge appliers out of `app-sidebar.tsx` into a shared module (e.g. `src/shared/lib/dashboard-nav.ts`). Sidebar and mobile tabs both call it.

**Why:** If the tab bar copies `if (canManageChurch)` / `isCellLeader`, we get two policies. A new structure layer or a new Attendance child would update one chrome and miss the other.

**Alternative:** Leave trees in the sidebar and hard-code five tabs. Rejected — that is the `standardType === 'Fellowship'` failure mode on chrome.

**What changes:** which destinations are *promoted* vs overflow (manager).  
**What stays:** routes, abilities, `isSidebarNavItemActive`, page engines.

### 2. `createMobileTabs(entries)` is the manager

**Choice:** Pure function: input = nav entries (+ current pathname for active). Output = `{ tabs, overflow }` where each tab has `id`, `label`, `to` (landing), `active`. More is a tab with no `to`; the engine opens a sheet.

Promotion order is fixed (Home → Attendance → Givings → Roster). Landing path for a group is the first child’s `to` (same as today’s collapsed-group click). Labels on the bar: Home, Attendance, Givings, Roster, More — not “Dashboard” / “Campaigns”.

**Tests lock two shapes before UI:** church-manager tree (five tabs, Structure/Settings in overflow) and cell-leader / no-Roster tree (no Roster tab, no Structure tab).

**Alternative:** Role switch in `MobileTabBar`. Rejected — volatility in the engine.

### 3. Breakpoint is `lg`, hamburger goes away

**Choice:** Show tabs when the desktop sidebar is hidden (`<lg`). Remove the topbar hamburger on that range; More replaces the drawer.

**Why:** Today hamburger is already `lg:hidden`. Using `md` would leave tablet with hamburger *and* no tabs, or both. One chrome per breakpoint.

**Alternative:** Keep hamburger plus tabs. Rejected — two overflow surfaces.

### 4. Safe area is CSS, not a new layout library

**Choice:** Tab bar uses `padding-bottom: env(safe-area-inset-bottom)` and the main column gets matching bottom padding. No extra UI kit.

### 5. Files stay in `shared/layout` + `shared/lib`

This is shell, not a product feature. Do not invent `features/mobile`. Manager + tests in `shared/lib` (or `shared/layout` if they only serve chrome). Engine: `mobile-tab-bar.tsx` + More sheet. `dashboard-layout.tsx` mounts the bar; topbar drops the hamburger below `lg`.

`app-sidebar.tsx` is already large — extracting nav is also a no-god-files move, behavior-preserving first.

## Risks / Trade-offs

- **[Risk] Active-state fights nested routes** (Attendance metrics vs meeting types). → Reuse `isSidebarNavItemActive` / group-active; do not invent a second path table.
- **[Risk] More sheet feels like the old drawer.** → Same destinations, different job: leftover only, not the full tree.
- **[Risk] Five tabs crowd small phones.** → Hard cap; no sixth tab. If a role lacks Roster, the bar gets breathing room.
- **[Trade-off] Home label vs Dashboard.** Phone chrome says Home; sidebar can keep Dashboard. Same route.

## Migration Plan

Frontend-only. Ship with the usual Pages deploy. Rollback is revert; no schema.

## Open Questions

- Visual treatment of the bar (hairline vs floating pill) can be decided at apply time without changing requirements.
- Whether More is a bottom sheet or a full-screen list does not change the spec as long as leftover destinations are listed and navigate.
