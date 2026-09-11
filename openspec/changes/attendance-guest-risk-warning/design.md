## Context

See proposal.md for motivation. Invitees are a persistent cell pool (`attendance_cell_invitees`); sheets store per-occurrence `attendance_invitee_entries`. Submit is `AttendanceSubmissionService`; the parent queue is `AttendanceApprovalService` → `AttendanceApprovalQueueItemDto` (unit, meeting, counts, no risk). Approvals UI is `attendance-approval-queue.tsx` + detail modal. Add invitee (`CreateCellInviteeAsync`) already requires a phone but does not unique-check name or phone.

`AttendanceScopeSubmission` has no risk columns. `AttendanceApprovalService` is the right place to *expose* a stored score, not to invent rules.

## Goals / Non-Goals

**Goals:**
- Pure guest-risk manager (inputs → `clear` | `watch` | `flagged` + reasons). Lock with unit tests before wiring.
- Score on **submit**; persist on the scope submission; return on queue + review DTOs.
- Approvals paints a warning; Approve/Reject unchanged.

**Non-Goals:**
- Blocking Add invitee or unique-name/phone validation
- Changing default-Present carry-forward of the guest pool (separate product)
- ML / pastor-wide dashboards / blocking approve
- Scoring drafts (save only)

## Decisions

1. **Manager owns policy**  
   One function: sheet snapshot (member present/absent, invitee present + phones + names, prior present phones for this `scopeNodeId`) → result. No JSX, no `Fellowship` string.  
   Alternative: score only in the React approvals page — rejected; parents would see a different answer than the API, and submit is the audit moment.

2. **Persist on `attendance_scope_submissions`**  
   `GuestRiskLevel` (string, default `clear`) + `GuestRiskReasons` (text/json list). Recompute on each submit (including resubmit after reject).  
   Alternative: compute on every queue read — rejected; history of “what we warned at submit” is lost if rules change.

3. **v1 signals (test-locked thresholds)**  
   - **Imbalance:** present invitees vs present members (e.g. ≥3× and ≥6 guests → `watch`; ≥5× and ≥10 guests → `flagged`).  
   - **All-new phones:** present invitee phones with no prior *present* invitee entry on an earlier submitted sheet for that unit (e.g. ≥5 all-new → `watch`).  
   - **Identity collision on this sheet:** same normalized name with ≥3 phones, or same phone with ≥2 names → `flagged`.  
   Highest severity wins; reasons are additive. Same first name alone is not a signal.

4. **Sibling service, not a god file**  
   `GuestRiskService` (or equivalent) gathers snapshot + prior phones and calls the manager. `AttendanceSubmissionService` invokes it on submit. `AttendanceApprovalService` only reads stored fields onto DTOs. Do not append 200 lines of scoring onto either existing service (`no-god-files`).

5. **Warning UI**  
   Queue: amber line under counts when not `clear`. Detail: short banner + reason list above the roll call. Approve stays enabled.

## Risks / Trade-offs

- [Honest revival / outreach Sunday] → Warning only; parent still approves. Tune thresholds in the manager tests, not the screen.  
- [Missing/shared phones] → Collision signal is weak if everyone typed `000`. Still useful with imbalance.  
- [Rule drift vs stored score] → Queue shows what was stored at submit; document that resubmit refreshes.

## Migration Plan

1. Add columns; backfill existing rows as `clear` / empty reasons.  
2. Manager + tests → score on submit → DTO + Approvals UI.  
3. Rollback: ignore columns; UI hides warning when level missing/`clear`.

## Open Questions

- None blocking. Extra signals (add-burst via `CreatedAt`) can wait for a later slice.
