# Roster unit actions menu — design

**Date:** 2026-08-09

## Goal

Add a **⋯** actions menu on roster unit rows (main list and child unit tables) with shortcuts to view members, leaders (filtered), and direct child layers (e.g. fellowships, cells, bible study).

## Scope

### Menu placement

| Location | Behavior |
|----------|----------|
| `/roster` main list | New actions column; navigation-only menu |
| Child unit tables inside unit detail | View items + existing Edit/Delete for pastors |

Fellowship leaders (read-only roster) get navigation items only.

### Menu items

1. **View members** → Members tab, no filter
2. **View leaders** → Members tab with role `is not Member` preset
3. **View {displayName}** → direct child layer tab (hidden if no child layer)

### URL deep-linking

```
/roster/units/:id?tab=members
/roster/units/:id?tab=members&preset=leaders
/roster/units/:id?tab=<layerId>
```

### Members tab

Reuse `MemberTableToolbar` + `member-filters.ts` on unit Members tab. `preset=leaders` seeds leader filter rules.

## Out of scope

- Dedicated Leaders tab
- New routes beyond query params
- Hardcoded “Bible Study” label (uses layer `displayName`)

## Files

| File | Change |
|------|--------|
| `roster-unit-actions-menu.tsx` | New shared menu |
| `roster-view.tsx` | Actions column |
| `structure-unit-node-table.tsx` | Extend menu |
| `roster-unit-view.tsx` | URL tab + filters |
| `structure-tree.ts` | `directChildLayer` helper |
| `member-filters.ts` | `leadersMemberFilterPreset` |
| `roster-navigation.ts` | URL builders |
