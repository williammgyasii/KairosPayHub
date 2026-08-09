# Attendance system design

**Date:** 2026-08-09  
**Builds on:** [`2026-08-07-mvp-domain-design.md`](./2026-08-07-mvp-domain-design.md)  
**Prerequisite:** Structure template + nodes + members + role assignments — **done**

## Goal

Church-wide and scoped **attendance roll call** for recurring and one-off meetings — **same chain as givings**, but records **Present / Absent** instead of money. Cell leaders capture attendance for their unit and **submit up the chain** for approval. Pastor configures meeting types, deadlines, excused weeks, and gets rollups plus a pending-approval queue.

**Mental model:** Givings = contribution + screenshot → approve. Attendance = roll call sheet → approve.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Meeting scope | Flexible **meeting types** (Sunday service, PFCC Wednesday, cell fellowship, special programs, …) |
| Occurrences | **Auto-generated** rolling window (e.g. next 8 weeks); pastor does not create each date manually |
| Who marks | **Leaders** mark members in their assigned scope and **submit for approval** |
| Approval chain | **Same as givings:** Cell leader → Fellowship leader → PFCC manager (if church has PFCC) → Pastor sees final approved roll-ups |
| Approval unit | One **scope submission** per leader unit per occurrence (whole cell roll call approved at once, like a bulk batch) |
| Member status (v1) | **Present** or **Absent** only |
| Pastor visibility | **Overall attendance** dashboard + **Submissions** pending queue + member profile history |
| Sidebar | **Attendance** nav group with sub-paths mirroring **Roster** and **Givings** (see UI section) |
| Excused meetings | Pastor marks an **occurrence** as **Excused** — no roll call, excluded from stats (e.g. holiday week with no PFCC Wednesday) |
| Input window | **Locked by default** until pastor-defined **open time** on/after the meeting — e.g. Sunday attendance only after Sunday service, never the day before |
| First deadline miss | Members stay **Unrecorded**; scope **locked**; **pastor notified** |
| Grace reopen | Pastor **reopens** a locked **leader scope** with a new deadline; leader notified |
| Grace deadline miss | All still-**Unrecorded** members in that scope → **Absent** (automatic); scope locked again |

## Database migrations (dev + prod)

Same rule as giving: EF migrations in repo; `Database__MigrateOnStartup=true` on Render dev + prod.

---

## Domain model

### AttendanceMeetingType

Pastor-defined recurring (or one-off) meeting template.

| Field | Notes |
|-------|--------|
| `Id`, `ChurchId` | Tenant |
| `Title` | e.g. "Sunday Service", "PFCC Meeting" |
| `RecurrenceKind` | `Weekly`, `OneOff` (v1) |
| `DayOfWeek` | For `Weekly` — e.g. Sunday, Wednesday |
| `ScopeKind` | `ChurchWide`, `PFCC`, `Fellowship`, `FellowshipGroup`, `Cell` — mirrors giving scope patterns |
| `ScopeNodeId` | Root of scope when not church-wide |
| `ScopeNodeIds` | Join table when `FellowshipGroup` multi-select |
| `OpensDayOffset` | Days **on or after** `MeetingDate` when input **opens** (default `0` = same day as meeting) |
| `OpensTimeUtc` | Time of day in **UTC/GMT** when input opens (e.g. `14:00` = 2pm GMT, after typical service) |
| `DeadlineDayOffset` | Days after occurrence date when submission **closes** (e.g. `1` = day after meeting) |
| `DeadlineTimeUtc` | Time of day in **UTC/GMT** when submission closes (e.g. `00:00` = midnight GMT) |
| `AutoGenerateWeeksAhead` | Default `8` — rolling horizon |
| `IsActive` | Soft-disable type without deleting history |
| `CreatedByAuthUserId`, `CreatedAt` | Audit |

**Example:** Sunday Service — `Weekly`, Sunday, `ChurchWide`:
- **Opens** after service: **Sunday 14:00 GMT** (`OpensDayOffset=0`, `OpensTimeUtc=14:00`)
- **Closes:** **Monday 00:00 GMT** (`DeadlineDayOffset=1`, `DeadlineTimeUtc=00:00`)

**Example:** PFCC Meeting — `Weekly`, Wednesday, `PFCC` scope:
- **Opens:** **Wednesday 20:00 GMT** (after evening meeting)
- **Closes:** **Thursday 00:00 GMT**

Pastor configures both windows per meeting type. Occurrences are **auto-created** for upcoming dates but stay **locked until `SubmissionOpensAt`** — leaders cannot pre-fill tomorrow’s Sunday roll call today.

### AttendanceOccurrence

One dated instance of a meeting type.

| Field | Notes |
|-------|--------|
| `Id`, `ChurchId`, `MeetingTypeId` | |
| `MeetingDate` | Calendar date of the meeting (church-local date stored as `DateOnly`) |
| `SubmissionOpensAt` | Computed from type rule (+ optional pastor override) — **no entry before this** |
| `SubmissionDeadlineAt` | Computed from type rule (+ optional pastor override) |
| `Status` | `Scheduled`, `Open`, `Closed`, `Excused` |
| `ExcusedReason` | Optional note when `Excused` |
| `ExcusedByAuthUserId`, `ExcusedAt` | Pastor action |
| `CreatedAt` | |

**Auto-generation:** Background job (or startup + daily tick) ensures each active `Weekly` type has occurrences from today through `AutoGenerateWeeksAhead`. Idempotent — skip dates that already exist.

**Excused:** Pastor sets `Status = Excused` on one occurrence. No entries required; excluded from attendance % and missing-submission checks. UI may offer “Excuse this week’s [type]” as a shortcut for the matching occurrence.

**Per-occurrence window override:** Pastor may adjust `SubmissionOpensAt` and/or `SubmissionDeadlineAt` for a single occurrence (holiday week, late service).

**Occurrence timeline (Sunday example, meeting 10 Aug):**

```text
Sat 9 Aug        Sun 10 Aug 14:00 GMT      Mon 11 Aug 00:00 GMT
     │                    │                          │
     └── Scheduled ───────┴──── Open (editable) ─────┴── Closed (deadline)
         (locked —        leaders mark & submit       missed → LockedMissed
          not yet open)   for approval
```

Before `SubmissionOpensAt`: occurrence is **Scheduled** — visible in lists but roll call is **read-only** (“Opens after service on …”). After `SubmissionDeadlineAt`: **Closed** for leaders (unless pastor reopens).

### AttendanceScopeSubmission

One **roll call package** per leader unit per occurrence — the attendance equivalent of a bulk contribution batch. This is what moves up the approval chain.

| Field | Notes |
|-------|--------|
| `Id`, `OccurrenceId` | |
| `ScopeNodeId` | Structure node this leader owns (cell node, fellowship node, PFCC node, …) |
| `AssignedLeaderAuthUserId` | Denormalized from `RoleAssignment` at generation time; refreshed if assignment changes while editable |
| `EnteredByRole` | `CellLeader`, `FellowshipLeader`, `PFCCManager` — who submitted |
| `ApprovalStatus` | `Draft`, `PendingApproval`, `Approved`, `Rejected` |
| `SubmittedAt`, `SubmittedByAuthUserId` | When leader clicked **Submit for approval** |
| `ApprovedByAuthUserId`, `ApprovedAt` | Approver at current chain step |
| `RejectedByAuthUserId`, `RejectedAt`, `RejectionReason` | Sent back to submitter |
| `LockStatus` | See lock lifecycle below (orthogonal to approval) |
| `GraceDeadlineAt` | Set when pastor reopens |
| `ReopenedByAuthUserId`, `ReopenedAt` | Pastor grace action |
| `LockedAt` | When scope became non-editable |

**Uniqueness:** `(OccurrenceId, ScopeNodeId)`.

#### Approval chain (mirrors `GivingScopeService`)

```text
CellLeader submits        → FellowshipLeader approves
FellowshipLeader submits  → PFCCManager approves (if church has PFCC managers)
                          → else Pastor is final approver
PFCCManager submits       → Pastor approves
```

Reuse the same `ResolveContributionApprovingRoleAsync` / `ApplyAwaitingMyApprovalFilterAsync` patterns in a new `AttendanceScopeService` (or shared helper). **Pastor does not enter attendance in v1** — only approves when they are the final step, overrides locked scopes, or excuses occurrences.

**Roll-ups and Overall attendance** include **Approved** submissions only (same as approved contributions in giving).

#### Lock lifecycle (input window + deadlines — orthogonal to approval)

```text
NotYetOpen ──(SubmissionOpensAt reached)──► Editable / Draft
       │
       └──► (leader submits) ──► PendingApproval ──(approver approves)──► Approved
                                      │
                    └──(deadline passes, still Draft)──► LockedMissed ──(pastor reopens)──► Reopened
                                                                                                  │
                                            └──(grace passes, still gaps)──► LockedGraceMissed
                                                 (auto-mark Unrecorded → Absent)
```

| LockStatus | Leader can edit entries? | Meaning |
|------------|--------------------------|---------|
| `NotYetOpen` | No | Before pastor-defined open time (e.g. Saturday for tomorrow’s Sunday) |
| `Editable` | Yes (while Draft or Rejected, within open→deadline window) | Normal editing |
| `Reopened` | Yes (until grace deadline) | Pastor granted second chance after missed deadline |
| `LockedSubmitted` | No | Submitted/approved path finished; window closed |
| `LockedMissed` | No | Deadline passed without submit |
| `LockedGraceMissed` | No | Grace passed; remaining Unrecorded → Absent |

**API guard:** `PUT entries` and `POST submit` return `403` with `notYetOpen: true` or `locked: true` when outside the allowed window. Pastor override bypasses lock (not `NotYetOpen` unless pastor explicitly opens early via override).

| ApprovalStatus | Visible in Submissions queue? |
|----------------|------------------------------|
| `Draft` | No — still editing |
| `PendingApproval` | Yes — awaiting **my** approval (chain rules) |
| `Approved` | No — counts in Overall roll-ups |
| `Rejected` | No — back to submitter as Draft |

On **reject**, scope returns to `Draft` + `Editable` (if before deadline); submitter notified (`NotificationKind.AttendanceSubmissionRejected`).

Pastor may **override** a locked scope — entries recorded with pastor as `MarkedBy`; approval status set to `Approved`.

### AttendanceEntry

One row per member per occurrence.

| Field | Notes |
|-------|--------|
| `Id`, `OccurrenceId`, `MemberId` | |
| `Status` | `Present`, `Absent`, `Unrecorded` |
| `MemberScopeNodeId` | Member’s placement node at mark time (denormalized) |
| `MarkedByAuthUserId`, `MarkedAt` | Leader or pastor override |
| `AutoMarkedAbsentAt` | Set when grace job converts Unrecorded → Absent |

**Uniqueness:** `(OccurrenceId, MemberId)`.

**Initial state:** On occurrence generation, create `Unrecorded` entry stubs for every active member in each scope submission’s subtree (or lazy-create on first open — implementation choice; stubs preferred for accurate counts).

---

## Authorization

Reuse `RoleAssignment` + structure subtree checks (same patterns as `GivingScopeService`).

| Role | Meeting types | Mark & submit | Approve submissions | Overall / roll-ups |
|------|---------------|---------------|---------------------|-------------------|
| Pastor | Create, edit, deactivate | Override locked scopes only | Final approver when chain ends at Pastor | Full church **Overall attendance** |
| PFCC manager | View in scope | PFCC-scoped types (if they mark) | Submissions from **FellowshipLeader** | Subtree in Overall |
| Fellowship leader | View | Own scope if needed | Submissions from **CellLeader** in scope | Subtree in Overall |
| Cell leader | View | Own cell roll call → submit | — | Own cell only |
| Member | — | — | — | Own history (profile tab) |

Leaders only see occurrences where their scope has an `AttendanceScopeSubmission` row. **Submissions** page uses the same “awaiting my approval” filter as `/givings/transactions`.

---

## Input window & deadline behavior

### Window computation

For occurrence on `MeetingDate` (stored as `DateOnly`, interpreted in UTC for v1):

```text
SubmissionOpensAt   = MeetingDate + OpensDayOffset days,   at OpensTimeUtc (GMT)
SubmissionDeadlineAt = MeetingDate + DeadlineDayOffset days, at DeadlineTimeUtc (GMT)
```

Both stored as `DateTimeOffset` (UTC). **Invariant:** `SubmissionOpensAt < SubmissionDeadlineAt`.

Default for Sunday service: opens **same Sunday after service** (`OpensDayOffset=0`), closes **Monday midnight GMT** (`DeadlineDayOffset=1`). Leaders **cannot** enter attendance for a future occurrence before its open time — even though auto-generation already created the row.

### Processing (hosted service)

Lightweight `IHostedService` runs every **1–5 minutes** (no external cron in v1):

1. Transition scopes from `NotYetOpen` → `Editable` when `SubmissionOpensAt` is reached (occurrence `Scheduled` → `Open`).
2. Find scope submissions past `SubmissionDeadlineAt` (or `GraceDeadlineAt` if `Reopened`) still `Draft` / not submitted → `LockedMissed` or `LockedGraceMissed`.
3. On first transition to `LockedMissed`: notify **pastor** (`NotificationKind.AttendanceSubmissionMissed`).
4. On transition to `LockedGraceMissed`: set all `Unrecorded` entries in that scope to `Absent` with `AutoMarkedAbsentAt`; notify pastor (`NotificationKind.AttendanceGracePeriodMissed`).
5. When all scopes for an occurrence are terminal (`Approved` + locked, `Locked*`, or excused skipped), set occurrence `Status = Closed`.

**Note:** `PendingApproval` submissions past deadline are still approvable; the **submitter** missed the deadline, not the approver. Pastor is notified about **missing submitters**, not missing approvers (v1).

Also run deadline checks on read (dashboard load) so UI stays correct if the worker is delayed.

### Pastor reopen (grace)

`POST /api/attendance/occurrences/{id}/scopes/{scopeNodeId}/reopen`

Body: `{ "graceDeadlineAt": "..." }` (UTC, must be in the future)

- Sets scope `Status = Reopened`, `GraceDeadlineAt`, audit fields.
- Notifies assigned leader (`NotificationKind.AttendanceScopeReopened`).
- Leader may edit until grace deadline.

### Notification kinds (extend enum)

| Kind | Recipient | When |
|------|-----------|------|
| `AttendancePendingApproval` | Next approver in chain | Scope submitted for approval |
| `AttendanceSubmissionApproved` | Submitter | Approver accepted roll call |
| `AttendanceSubmissionRejected` | Submitter | Approver rejected (with reason) |
| `AttendanceSubmissionMissed` | Pastor | Scope locked at first deadline without submit |
| `AttendanceScopeReopened` | Leader | Pastor grants grace period |
| `AttendanceGracePeriodMissed` | Pastor | Grace ended; auto-absent applied |

Link paths: `/attendance/submissions`, `/attendance/{typeId}/occurrences/{id}`, or `/attendance/overall` drill-down.

---

## API surface (v1)

| Method | Route | Role |
|--------|-------|------|
| `GET` | `/api/attendance/meeting-types` | Pastor (+ scoped read for leaders) |
| `POST` | `/api/attendance/meeting-types` | Pastor |
| `PATCH` | `/api/attendance/meeting-types/{id}` | Pastor |
| `GET` | `/api/attendance/meeting-types/{id}/occurrences` | List occurrences for a type |
| `GET` | `/api/attendance/occurrences/{id}` | Detail + scope submissions + entries |
| `PATCH` | `/api/attendance/occurrences/{id}/excuse` | Pastor — set Excused |
| `PATCH` | `/api/attendance/occurrences/{id}/window` | Pastor — override opens and/or deadline |
| `PUT` | `/api/attendance/occurrences/{id}/scopes/{scopeNodeId}/entries` | Leader (if editable) or Pastor override |
| `POST` | `/api/attendance/occurrences/{id}/scopes/{scopeNodeId}/submit` | Leader — submit roll call for approval |
| `POST` | `/api/attendance/occurrences/{id}/scopes/{scopeNodeId}/approve` | Next approver in chain |
| `POST` | `/api/attendance/occurrences/{id}/scopes/{scopeNodeId}/reject` | Next approver in chain |
| `POST` | `/api/attendance/occurrences/{id}/scopes/{scopeNodeId}/reopen` | Pastor — grace reopen |
| `GET` | `/api/attendance/submissions` | Pending approval queue (chain-filtered) |
| `GET` | `/api/attendance/overall` | Approved roll-ups, missing submitters, structure drill-down |
| `GET` | `/api/attendance/members/{memberId}/history` | Pastor, leader in scope, or member (self) |

Roll-up queries walk structure from `MemberScopeNodeId` by layer — same ancestor-walk approach as giving rollups.

---

## UI (v1)

### Sidebar — **Attendance** group (mirrors Givings + Roster pattern)

Same collapsible group style as **Roster** (Units / Membership) and **Givings** (Campaigns / Transactions / Overall).

| Sub-path | Route | Givings analog | Audience | Purpose |
|----------|-------|----------------|----------|---------|
| **Meeting types** | `/attendance` | Campaigns | Pastor (+ leaders read) | List recurring types; drill into occurrences |
| **Submissions** | `/attendance/submissions` | Transactions | Fellowship, PFCC, Pastor | Pending approval queue; approve/reject roll calls |
| **Overall attendance** | `/attendance/overall` | Overall givings | Pastor | Approved roll-ups, attendance %, missing submitters |

**Nav visibility (same pattern as givings):**

| Role | Meeting types | Submissions | Overall |
|------|---------------|-------------|---------|
| Pastor | ✓ | ✓ | ✓ |
| PFCC manager | ✓ | ✓ (PFCC queue) | — |
| Fellowship leader | ✓ | ✓ (fellowship queue) | — |
| Cell leader | ✓ (Scheduled + Open only; not editable until open) | — | — |

Add `sidebar-nav.ts` matchers: `attendance-meeting-types`, `attendance-submissions`, `attendance-overall`, `attendance-section` — parallel to `givings-*`.

### Meeting type detail → occurrence roll call (leader)

Route: `/attendance/:typeId/occurrences/:occurrenceId`

- **Scheduled state:** show meeting date + “Opens …” (countdown to `SubmissionOpensAt`); all controls disabled
- **Open state:** member list with Present / Absent toggles; **Save draft** vs **Submit for approval**
- **Closed / locked:** read-only; banner explains why (not yet open / deadline passed / contact pastor)
- Status badges: Scheduled, Draft, Pending approval, Approved, Rejected, Locked
- Show both **opens** and **closes** times (GMT labels)

### Submissions page

Mirror `TransactionsPage` / `contributions-approval-table.tsx`:

- Columns: Meeting type, Occurrence date, Unit (cell/fellowship), Submitted by, Submitted at, Present/Absent counts
- Row actions: Approve, Reject (with reason), open detail modal with member list

### Overall attendance page

Mirror `OverallGivingsPage`:

- Approved-only stats (attendance %, present count, absent count)
- Drill-down by PFCC → fellowship → cell
- Highlight units that **missed submit deadline** (unrecorded / locked missed)

### Pastor occurrence admin (from Meeting types drill-down)

- Per-scope cards: Draft / Pending / Approved / Missing / Locked
- Actions: Excuse occurrence, adjust open/deadline window, reopen scope, override edit

### Member profile — **Records** tab

Replace “Coming soon” placeholder with **approved** attendance history (date, meeting type, Present/Absent; auto-absent flagged).

---

## Implementation phases

Build in order; each phase: **failing tests → review → implement → review**.

| Phase | Scope |
|-------|--------|
| **1** | Entities, migration, meeting type CRUD, occurrence auto-generator |
| **2** | Scope submissions + entry stubs + leader roll-call PUT + submit |
| **3** | Approval chain (approve/reject) + Submissions API + notifications |
| **4** | Deadline worker + lock transitions + pastor reopen + grace auto-absent |
| **5** | Sidebar group + Meeting types + Submissions UI (mirror givings) |
| **6** | Overall attendance roll-ups + member profile history tab |

Phase 1–4 are backend-heavy; Phase 5–6 frontend. Split PRs by phase where possible.

---

## Testing focus

- Occurrence generator idempotency and 8-week horizon
- **Cannot PUT/submit before `SubmissionOpensAt`** (Saturday user blocked from tomorrow’s Sunday)
- Open + deadline math across GMT boundaries (Sunday 14:00 open → Monday 00:00 close)
- Worker transitions `NotYetOpen` → `Editable` at open time
- Lock transitions: incomplete → `LockedMissed`; grace → `LockedGraceMissed` + bulk Absent
- Leader cannot PUT after lock; pastor override succeeds
- Excused occurrence skips deadline notifications
- Roll-up % excludes Excused occurrences and counts Present/(Present+Absent) only
- Scope isolation: cell leader cannot mark outside cell
- Approval chain: cell submission visible only to owning fellowship leader; PFCC path when managers exist
- Overall counts exclude non-approved submissions (same rule as giving)

---

## Out of scope (v1)

- Member self check-in (QR/link)
- Partial statuses (Late, Excused absence per member)
- Approver deadline enforcement (only **submitter** deadline in v1)
- Email/SMS reminders (in-app notifications only)
- Attendance export / PDF
- Hybrid manual occurrence creation (may add later; v1 is auto-only)
- Bulk “excuse all Wednesdays this week” as separate entity (v1: per-occurrence excuse + UI shortcut)

---

## Open for implementation plan only

- Exact `ScopeKind` enum parity with giving (confirm `FellowshipGroup` join table reuse pattern)
- Whether entry stubs are created at occurrence generation or on first leader open (recommend eager stubs for pastor counts)
