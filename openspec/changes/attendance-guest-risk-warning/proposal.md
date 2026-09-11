## Why

Cell leaders can add any invitee name on Mark attendance. That is intentional — two guests can share a first name, and Add invitee must not block honest capture. Parent leaders (fellowship / whoever approves) still need a way to notice sheets that look padded (burst guests, no returning phones, guests far outnumber members present) without locking approve.

## What Changes

- Score each unit roll-call **on submit** with a guest-risk manager (`clear` / `watch` / `flagged` plus short reasons)
- Persist that score on the scope submission
- Show a **warning** on Attendance → Approvals (queue row + detail); approve and reject stay available
- Do **not** change Add invitee validation (no unique-name or unique-phone block)
- Do **not** hide or auto-present last week’s guests as a substitute for this score (marking guests present/absent is out of scope)

## Capabilities

### New Capabilities
- `attendance/guest-risk`: Submit-time guest-risk score, warning-only display for parent approvers, Add invitee remains unrestricted

### Modified Capabilities
- None

## Impact

- API: score on submit; expose level + reasons on approval queue and review DTOs; persist on `attendance_scope_submissions`
- Frontend: Approvals list and detail warning; no change to Add invitee form rules
- Policy lives in a manager (not role/`Fellowship` string gates in the screen)
