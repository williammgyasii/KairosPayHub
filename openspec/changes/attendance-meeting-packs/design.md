## Context

See proposal.md for why. Occurrences already exist per meeting type + date. Object storage already uploads and can `TryOpenReadAsync` (avatars, report photos). Calendar church-wide notify already resolves pastors + leaders; pack audience is the leader subset (no members, no publisher chase). `AttendanceController` is already near the god-file limit — pack endpoints go on a sibling controller.

## Goals / Non-Goals

**Goals:**

- Policy manager for publish permission, completeness, allowed file kinds, and audience (from meeting scope, not title).
- Engine: upload, publish, GET (marks seen), download (marks downloaded + streams), receipts for managers.
- One pack per occurrence; replace in place.

**Non-Goals:**

- Video, a church-wide Drive, multi-week windows, leader-authored packs, WhatsApp export.

## Decisions

### 1. Pack rows on the occurrence, not JSON on the type

**Choice:** `AttendanceMeetingPack` (note, published metadata) + `AttendanceMeetingPackFile` (storage key, name, type, size) + `AttendanceMeetingPackReceipt` (auth user, seenAt, downloadedAt).

**Why:** Files need stable ids for download. Receipts need timestamps. The type must stay a recipe.

**Alternative:** JSON blob on `AttendanceOccurrence`. Rejected — download and audit become stringly.

### 2. `meetingPackPolicy` + `AttendanceMeetingPackPolicy`

**Choice:** Pure completeness (note or ≥1 file), allow-list (PDF + JPEG/PNG/WebP), max 5 files, 10 MB each. Audience via `NotificationRecipientResolver.ForMeetingPackLeadersAsync` (church-wide = non-pastor leaders; scoped = leaders whose assignment intersects the scope node). Publish = `canManageChurch`.

**Why:** Sunday vs Cell stay data. If completeness lives only in the modal, the API will drift.

**What changes:** note, files, scope.  
**What stays:** occurrence chrome, notify engine, storage.

### 3. Private download, not public R2 URL

**Choice:** Store the object key. `GET .../files/{id}/download` opens via `TryOpenReadAsync`, writes `downloadedAt` if null, returns the stream. GET pack for a leader in audience writes `seenAt` if null.

**Why:** A public URL recreates WhatsApp.

### 4. Sibling service + controller

**Choice:** `AttendanceMeetingPackService` + `AttendanceMeetingPackController`. Do not grow `AttendanceMeetingTypeService` or `AttendanceController`.

### 5. Notify fingerprint

**Choice:** Hash of trimmed note + ordered file ids. Notify on first publish and when the hash changes.

### 6. Pastor compose is its own Attendance destination

**Choice:** Church managers pick meeting type, then occurrence, on **Share files**. Leaders still open the pack on Mark attendance. Meeting types stays a recipe list.

**Why:** Sharing a week’s files is not configuring the standing type. Mixing it into Mark attendance made pastors look like roll-call users.

## Risks / Trade-offs

- [Leaders assigned after publish miss the first notify] → They still appear on the live audience audit and can open the pack; they are not backfilled a notify.
- [10 MB × 5 in tests] → Fake storage already in `ApiFactory`; integration tests use tiny PDFs/JPEGs.

## Migration Plan

New tables, empty. Rollback = drop tables; no backfill.
