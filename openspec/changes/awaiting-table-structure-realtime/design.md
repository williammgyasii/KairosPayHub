## Context

Pastor pending columns hardcode `PFCC`. Approval table is a large hand-rolled HTML table with inline action buttons. Notifications already arrive via SignalR (`useNotificationsRealtime`).

## Decisions

1. **Structure helpers** in `contribution-structure.ts`: `churchHasLayerType`, `structureScopeColumnLabel`, `memberStructureUnitLabel` — prefer PFCC ancestor only if layer exists on template; else fellowship/unit.
2. **Approval table**: keep fetch/pagination logic; switch rendering to TanStack `useReactTable` + `MoreHorizontal` dropdown; move total into a compact summary table above the grid.
3. **Recent activity**: pass optional `onApprove`/`onReject`/`canAct` from `ProgramDetailView` → dashboard → table; inline badge + text-xs.
4. **Realtime**: on `ContributionPendingApproval` | `ContributionApproved` | `ContributionRejected`, dispatch `invalidateGivingTags()` (and program-scoped tags when `programId` present on notification).

## Non-Goals

- Dedicated contribution SignalR hub payloads (patch-by-id).
- Changing who is allowed to approve.
