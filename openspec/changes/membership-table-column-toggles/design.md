## Context

`StructureMemberTable` already uses TanStack Table. Profile fields (email, residence, occupation, school/work) only appear when `extendedColumns` is true. State, workplace, and DOB are stored and mapped on `StructureMemberRow` but have no columns. Attendance already has a Columns dropdown + `ColumnToggleSwitch`.

## Goals / Non-Goals

**Goals**

- Columns control on membership (and same table in unit drill-in) to toggle profile + structure columns.
- Always-on Name (and actions when present).
- Defaults: email, phone, role, responsiveness, all structure layers ON; age, DOB, residence, state, occupation, school/work, workplace OFF.

**Non-Goals**

- Persisting prefs to the server or localStorage (session state is enough for v1).
- Pending invitations / Invited membership status.
- Changing member list API payloads.

## Decisions

1. **Pure helper** `membership-table-columns.ts` owns ids, labels, defaults, and merging structure-layer visibility — mirrors sticky helper / attendance column constants; easy to unit test.
2. **Always build all columns** when not `compactLayout`; drive show/hide via TanStack `columnVisibility` instead of `extendedColumns` boolean. Keep `extendedColumns` as a deprecated alias that seeds defaults to “all profile on” only if needed for other call sites — prefer explicit `columnVisibility` from parent. Membership view and unit view will own state and pass it in.
3. **Reuse** `ColumnToggleSwitch` from attendance-overview-parts (or re-export from a shared ui spot if import feels odd — prefer direct import to avoid new shared file for one component).
4. **Structure layer toggles** use column id `structure-${layer.id}` with `displayName` as label.

## Risks / Trade-offs

- Wide tables when many columns on — mitigated by defaults and horizontal scroll already present.
- Compact layout (giving picker etc.) stays without column toggles.

## Migration Plan

None.
