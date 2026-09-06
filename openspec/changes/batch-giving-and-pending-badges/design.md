## Context

Bulk log today loops `POST .../contributions` with a client-generated `batchId`. Each `CreateAsync` calls `NotifyContributionPendingAsync`. Recent activity renders raw contribution rows. Attendance already badges the sidebar from an approval queue query.

## Goals / Non-Goals

**Goals:** One batch notification; one recent-activity row per batch; no Log modal unmount on refetch; awaiting counts on program list + campaigns UI + Givings nav badge.

**Non-Goals:** Changing approval workflows; merging historical notifications; offline batch upload of CSV.

## Decisions

1. **`POST /api/giving/programs/{id}/contributions/batch`** — body: shared fields + `items[]` (memberId, amount). Server assigns `BatchId`. Transactional create; notify once via `NotifyContributionBatchPendingAsync`.
2. **Single create** — unchanged notify path when `BatchId` is null. If `BatchId` is set on single create (legacy client), suppress per-row notify so only batch endpoint (or a follow-up) owns batch notify. Wizard will use batch endpoint only for bulk.
3. **`awaitingMyApprovalCount` on `GivingProgramDto`** — computed with existing awaiting-my-approval scope filters when listing programs.
4. **Campaigns UI (D1)** — clickable count badge beside campaign title → `/givings/{id}?tab=awaiting`. Sidebar Givings badge = sum of awaiting counts across listed programs (same audience as attendance badges: roles that can approve).
5. **ProgramDetailPage** — never replace the page with a full-page spinner when program data already exists; allow background refetch while Log modal stays open.

## Risks / Trade-offs

- Batch endpoint must validate every line before save (partial batches are confusing). Prefer all-or-nothing.
- Sidebar sum may over-count if parent + child both list the same pending rows; prefer counting only root programs or dedupe by contribution id when aggregating.

## Migration

No schema migration; `BatchId` already exists.
