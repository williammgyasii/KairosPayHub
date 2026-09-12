## Context

See proposal.md for why. `AttendanceMeetingType` today is schedule + submission layer + windows. `AttendanceScopeSubmission` is draft/pending/approved plus guest-risk. Mark attendance is a two-step wizard (`pick` | `mark`) on `AttendanceSubmissionsPage`. Photos already have a pipe: `IObjectStorage` (R2) used by church logo and `UserAvatarService` (JPEG/PNG/WebP, 2 MB).

## Goals / Non-Goals

**Goals:**

- Policy on the meeting type (requires + schema). Engine on the wizard and approval reader.
- Schema-driven render so Sunday and Cell never need `if (title === …)`.
- Submit rejected server-side if a required report is incomplete (UI disable is not enough).
- Photos reuse object storage; no new vendor.

**Non-Goals:**

- Church-wide template, dropdown / yes-no / PDF kinds.
- Cropper, video, or “report without roll call.”
- Rewriting historical payloads when a pastor later edits the schema.

## Decisions

### 1. Schema JSON on the meeting type; answers JSON on the submission

**Choice:** `RequiresReport` (bool) + `ReportSchema` (json) on `AttendanceMeetingType`. `ReportPayload` (json) on `AttendanceScopeSubmission`. Schema is an ordered list of `{ id, kind: 'longText' | 'photos', label, required }`. Payload is `{ [fieldId]: string | string[] }` (text or image URLs).

**Why:** New prompt kinds later are data. Hard columns (`WhatWasTaught`) would force a migration per church request.

**Alternative:** One church-wide settings template. Rejected — Sunday and Cell in the same church disagree.

Default schema (only when toggle flips on and schema is empty): taught, shared, optional prayer, required photos.

### 2. `reportPolicy(type, answers)` is the manager

**Choice:** Pure module in `features/attendance/lib/report-policy.ts`: default schema, completeness, whether the wizard shows a report step. Tests lock two schemas (default vs custom) before UI.

**Why:** If completeness lives in the wizard, a second surface (reopen, API) will drift.

**What changes:** prompts and required flags.  
**What stays:** pick → mark → (optional report) → submit; approval modal chrome.

### 3. Third wizard step, not a submit modal

**Choice:** `WizardStep = 'pick' | 'mark' | 'report'`. Report step only when `reportPolicy(type).required`.

**Why:** Photos + keyboard on a phone need a full step. The existing `wizard-shell` already hosts this flow.

### 4. Photos: same storage rules as avatars, scoped keys

**Choice:** `POST` upload on the submission (or a report-photo endpoint) → `IObjectStorage` key like `churches/{churchId}/attendance-reports/{submissionId}/{fileId}.{ext}`. JPEG/PNG/WebP, 2 MB each, at most 5 images per photos prompt. Completeness = ≥1 URL on a required photos field.

**Alternative:** Inline base64 in the JSON payload. Rejected — blows the row and the API.

### 5. Schema edits do not rewrite old reports

**Choice:** A submitted payload is frozen with the field ids/labels used at submit time (store labels on the payload or snapshot the schema beside answers). Later schema edits apply to drafts and new submits only.

**Alternative:** Migrate old answers onto new prompts. Rejected — we cannot invent “What was taught” from a renamed field.

### 6. Files stay in `features/attendance`

Meeting-type form, report step, approval read-back, API client, and `report-policy` live in the attendance feature. Shared: object storage only. Do not grow `AttendanceMeetingTypeService` past the hard limit — a sibling `AttendanceReportService` owns upload + completeness on submit.

## Risks / Trade-offs

- **[Risk] Pastor deletes a required photos prompt.** → Allowed; completeness follows the current schema. Default still includes required photos so “evidence” is the starting point, not a lock.
- **[Risk] R2 missing locally.** → Same 503 as avatar/logo; tests use a fake store.
- **[Risk] Large phone uploads.** → Cap 5 × 2 MB; show a clear size/type error.
- **[Trade-off] No yes/no in v1.** Churches that want a checklist wait; adding a kind later is a schema enum, not a new wizard.

## Migration Plan

- EF: nullable/default `RequiresReport = false`, `ReportSchema = null` (or `[]`), `ReportPayload = null`.
- Backfill not required; old types stay no-report.
- Rollback: revert migration after disabling the UI toggle (payloads can remain unused).

## Open Questions

- Exact max photo count (5) can move slightly at apply time without changing “at least one.”
- Whether the approval list row shows a “Has report” badge is visual only.
