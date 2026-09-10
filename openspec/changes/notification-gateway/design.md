## Context

`NotificationService` (~956 lines) owns inbox CRUD, copy builders, recipient resolution, and `CreateMany` + SignalR. Contribution pending recipients duplicate (and lag) `GivingScopeService.ResolveContributionApprovingRoleAsync`. Attendance pending fans to Fellowship (+ PFCC if any) and can notify nobody on Church → Cell.

Agreed shape: **managers + composers + engine**, in-app only for v1.

## Goals / Non-Goals

**Goals**
- Single hop for approve + contribution notify
- Structure-aware attendance pending recipients
- Engine = persist + push; inbox = read path; composers keep `Notify*` surface for call sites
- Keep existing `NotificationKind` enum and DTO shape

**Non-Goals**
- Email / SMS channels
- Domain-event bus
- Frontend bell redesign
- Changing when notifications fire (only who + how delivery is structured)

## Decisions

1. **Keep `NotificationService` as the composer façade** injected by Contribution / Giving / Attendance / Calendar / Controller — so call sites stay stable. Internally it depends on `NotificationEngine` + recipient helpers on `GivingScopeService` (or a thin `NotificationRecipientResolver` that wraps scope).
2. **Extract `NotificationEngine`** with `DeliverAsync(churchId, recipients, kind, title, body, link, programId, relatedEntityId)`.
3. **Extract inbox methods** onto `NotificationInboxService`; controller injects inbox; composer may stay separate or controller uses both — prefer controller → `NotificationInboxService` only.
4. **Contribution recipients**: `ResolveContributionApprovingRoleAsync` then map role → auth user ids (Pastor / PFCC scoped / Fellowship scoped). Delete the private duplicate switch.
5. **Attendance recipients**: next hop from submitter role (CellLeader → same skip-missing-layers chain as contributions). Prefer reusing contribution hop when entered-by is CellLeader; for attendance submission assume leaf/cell enterer unless we have EnteredByRole on submission — check entity.

## Attendance hop note

Today `AttendanceApprovalRecipientAuthUserIdsAsync` notifies *all* fellowship leaders covering the cell (+ PFCC managers). Spec for this change: skip missing layers and notify *next* approver like giving (not both FL and PFCC). Align with contribution: one next hop.

If attendance historically notified both FL and PFCC when both exist, **BREAKING** relative to old fan-out. Spec says “next leadership that exists” — one hop. Document in tasks and fix tests if any assert multi-role fan-out.

## Risks

- Large file move can break DI; register engine + inbox + keep composer name.
- Attendance behavior change if tests expect dual FL+PFCC notify — update tests to next-hop only.
- `StructureLayers.Template!.ChurchId` EF navigation — already used in scope service; keep consistent.

## Open Questions

- None material; email deferred.
