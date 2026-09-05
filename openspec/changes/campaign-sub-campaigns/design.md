## Context

Main campaigns act as containers; sub-campaigns are date- or period-specific slices. Both must accept contributions. Recurring sub-campaigns pre-generate discrete programs within a parent timeline.

## Goals / Non-Goals

**Goals:**
- Dual giving on parent + sub-campaigns
- Richer main campaign create wizard
- Recurring sub-campaign batch create with preview
- Go-live scheduling with delayed leader alerts

**Non-Goals (v1):**
- Linking campaigns to church calendar events
- Removing sub-campaign feature entirely

## Decisions

### Dual giving
- Remove backend guard blocking parent contributions when children exist.
- `acceptsContributions` = approved + open (ignore `hasChildren`).
- Parent `totalApprovedAmount` = direct approved on parent + sum of descendant approved.
- Rollup for parent includes self + descendants.
- `isLegacyParentContribution` only when contribution `createdAt` is before the first child program's `createdAt`.

### Campaign dates (chunk 2+)
- Add `StartsOn`, `EndsOn` (DateOnly), `GoLiveAt` (DateTimeOffset?), `Status` extended with `Scheduled` or derive from go-live vs now.
- Auto-generate `periodLabel` from date range for uniqueness index.
- Add `GivingType.Other` + optional `CustomTypeLabel`.

### Recurring sub-campaigns (chunk 3+)
- POST batch endpoint on parent: frequency (Weekly + dayOfWeek), range, logOpensOffsetDays (default 1).
- Preview endpoint returns count + sample titles before create.
- Each instance = existing child `GivingProgram` row with `EventDate`, `LogOpensAt`.

### Notifications
- Reuse `NotifyGivingCampaignOpenedAsync`; fire at go-live (immediate or scheduled job/check on read).

## Risks / Trade-offs

- Many sub-campaign rows for weekly year-long campaigns (~52) — acceptable; paginate list UI.
- Scheduled go-live needs background trigger — v1 can use status check on list/detail + manual "publish now" fallback.

## Migration Plan

- Existing data unchanged; dual-giving is behavior-only for new contributions.
- Date fields nullable on existing programs; backfill `periodLabel` as today.

## Open Questions

- None blocking chunk 1 (dual giving).
