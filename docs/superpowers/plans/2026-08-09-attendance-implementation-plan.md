# Attendance System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build recurring attendance with pastor-defined input windows, givings-style approval chain, deadline locking, and sidebar sub-paths (Meeting types / Submissions / Overall attendance).

**Architecture:** New `Domain/Attendance` entities + EF migration; services mirror `GivingScopeService` / `ContributionService` patterns; `AttendanceDeadlineWorker` (`IHostedService`) for open/deadline transitions; React pages mirror givings routes and components. Integration tests use existing `PostgresFixture` + `ApiFactory` pattern.

**Tech Stack:** .NET 8 API, EF Core + Postgres, xUnit integration tests (Testcontainers), React + Vite + TypeScript frontend, SignalR notifications.

**Spec:** [`docs/superpowers/specs/2026-08-09-attendance-design.md`](../specs/2026-08-09-attendance-design.md)

## Global Constraints

- EF migrations in repo; `Database__MigrateOnStartup=true` on Render dev + prod — never hand-patch schema on one DB only.
- Approval chain identical to givings: CellLeader → FellowshipLeader → PFCCManager (if any) → Pastor.
- Input window: locked until `SubmissionOpensAt`; closes at `SubmissionDeadlineAt` (UTC/GMT).
- Occurrences auto-generated 8 weeks ahead; eager `Unrecorded` entry stubs at generation.
- Overall roll-ups and member history show **Approved** submissions only.
- Restart local dev servers after runtime changes (see `.cursor/rules/restart-dev-servers.mdc`).
- **Do not commit or push unless the user explicitly asks.**

---

## File map

| File | Responsibility |
|------|----------------|
| `kairospayhub-api/src/KairosPayHub.Api/Domain/Attendance/AttendanceEntities.cs` | Enums + entity classes |
| `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceWindowCalculator.cs` | Pure open/deadline UTC math |
| `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceScopeService.cs` | Scope subtree + approval chain (mirror giving) |
| `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceMeetingTypeService.cs` | CRUD meeting types |
| `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceOccurrenceGenerator.cs` | Auto-generate occurrences + stubs |
| `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceSubmissionService.cs` | PUT entries, submit, approve, reject, reopen, override |
| `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceOverallService.cs` | Roll-ups + missing submitters |
| `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceDeadlineWorker.cs` | `IHostedService` lock transitions |
| `kairospayhub-api/src/KairosPayHub.Api/Controllers/AttendanceController.cs` | REST routes from spec |
| `kairospayhub-api/src/KairosPayHub.Api/Data/KairosDbContext.cs` | DbSets + fluent config |
| `kairospayhub-api/tests/.../AttendanceWindowCalculatorTests.cs` | Unit tests for window math |
| `kairospayhub-api/tests/.../AttendanceMeetingTypeApiTests.cs` | Phase 1 integration |
| `kairospayhub-api/tests/.../AttendanceRollCallApiTests.cs` | Phase 2 integration |
| `kairospayhub-api/tests/.../AttendanceApprovalApiTests.cs` | Phase 3 integration |
| `kairospayhub-api/tests/.../AttendanceDeadlineApiTests.cs` | Phase 4 integration |
| `kairospayhub-frontend/src/api/attendance.ts` | API client types + calls |
| `kairospayhub-frontend/src/lib/attendance-ui.ts` | Labels, badges, formatters |
| `kairospayhub-frontend/src/lib/sidebar-nav.ts` | `attendance-*` matchers |
| `kairospayhub-frontend/src/components/layout/app-sidebar.tsx` | Attendance nav group |
| `kairospayhub-frontend/src/pages/AttendanceMeetingTypesPage.tsx` | `/attendance` |
| `kairospayhub-frontend/src/pages/AttendanceSubmissionsPage.tsx` | `/attendance/submissions` |
| `kairospayhub-frontend/src/pages/OverallAttendancePage.tsx` | `/attendance/overall` |
| `kairospayhub-frontend/src/pages/AttendanceOccurrencePage.tsx` | Roll-call sheet |
| `kairospayhub-frontend/src/components/attendance/*` | Tables, modals, metrics |
| `kairospayhub-frontend/src/components/structure/member-detail-sheet.tsx` | Records tab history |

---

## Phase 1 — Domain, migration, meeting types, occurrence generator

### Task 1: Window calculator (pure logic)

**Files:**
- Create: `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceWindowCalculator.cs`
- Create: `kairospayhub-api/tests/KairosPayHub.Tests/Unit/AttendanceWindowCalculatorTests.cs`

**Interfaces:**
- Produces: `AttendanceWindowCalculator.Compute(DateOnly meetingDate, int opensDayOffset, TimeOnly opensTimeUtc, int deadlineDayOffset, TimeOnly deadlineTimeUtc) -> (DateTimeOffset opensAt, DateTimeOffset deadlineAt)`

- [ ] **Step 1: Write failing tests**

```csharp
using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Unit;

public class AttendanceWindowCalculatorTests
{
    [Fact]
    public void Sunday_service_opens_after_service_closes_monday_midnight_gmt()
    {
        var meetingDate = new DateOnly(2026, 8, 10); // Sunday
        var (opensAt, deadlineAt) = AttendanceWindowCalculator.Compute(
            meetingDate,
            opensDayOffset: 0,
            opensTimeUtc: new TimeOnly(14, 0),
            deadlineDayOffset: 1,
            deadlineTimeUtc: TimeOnly.MinValue);

        Assert.Equal(new DateTimeOffset(2026, 8, 10, 14, 0, 0, TimeSpan.Zero), opensAt);
        Assert.Equal(new DateTimeOffset(2026, 8, 11, 0, 0, 0, TimeSpan.Zero), deadlineAt);
        Assert.True(opensAt < deadlineAt);
    }
}
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd kairospayhub-api && dotnet test tests/KairosPayHub.Tests --filter AttendanceWindowCalculatorTests -v n`  
Expected: type `AttendanceWindowCalculator` not found

- [ ] **Step 3: Implement**

```csharp
namespace KairosPayHub.Api.Services;

public static class AttendanceWindowCalculator
{
    public static (DateTimeOffset OpensAt, DateTimeOffset DeadlineAt) Compute(
        DateOnly meetingDate,
        int opensDayOffset,
        TimeOnly opensTimeUtc,
        int deadlineDayOffset,
        TimeOnly deadlineTimeUtc)
    {
        var opensDate = meetingDate.AddDays(opensDayOffset);
        var deadlineDate = meetingDate.AddDays(deadlineDayOffset);
        var opensAt = new DateTimeOffset(opensDate.ToDateTime(opensTimeUtc), TimeSpan.Zero);
        var deadlineAt = new DateTimeOffset(deadlineDate.ToDateTime(deadlineTimeUtc), TimeSpan.Zero);
        if (opensAt >= deadlineAt)
            throw new ArgumentException("SubmissionOpensAt must be before SubmissionDeadlineAt.");
        return (opensAt, deadlineAt);
    }
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Pause for user review before Task 2**

---

### Task 2: Attendance entities + DbContext + migration

**Files:**
- Create: `kairospayhub-api/src/KairosPayHub.Api/Domain/Attendance/AttendanceEntities.cs`
- Modify: `kairospayhub-api/src/KairosPayHub.Api/Data/KairosDbContext.cs`
- Create: migration via `dotnet ef migrations add AddAttendance`

**Interfaces:**
- Produces enums: `AttendanceRecurrenceKind`, `AttendanceMeetingScopeKind` (same values as `ProgramScopeKind`), `AttendanceOccurrenceStatus`, `AttendanceScopeLockStatus`, `AttendanceScopeApprovalStatus`, `AttendanceEntryStatus`
- Produces entities: `AttendanceMeetingType`, `AttendanceMeetingTypeScopeNode`, `AttendanceOccurrence`, `AttendanceScopeSubmission`, `AttendanceEntry`

- [ ] **Step 1: Add entity file** (core fields from spec — include `OpensDayOffset`, `OpensTimeUtc`, `DeadlineDayOffset`, `DeadlineTimeUtc`, `AutoGenerateWeeksAhead` on meeting type; `SubmissionOpensAt`, `SubmissionDeadlineAt` on occurrence; `LockStatus`, `ApprovalStatus`, grace fields on scope submission)

- [ ] **Step 2: Register DbSets** in `KairosDbContext` + fluent API:
  - Unique index `(OccurrenceId, ScopeNodeId)` on scope submissions
  - Unique index `(OccurrenceId, MemberId)` on entries
  - Unique index `(MeetingTypeId, MeetingDate)` on occurrences
  - Store `TimeOnly` opens/deadline times on meeting type

- [ ] **Step 3: Generate migration**

Run: `cd kairospayhub-api/src/KairosPayHub.Api && dotnet ef migrations add AddAttendance`

- [ ] **Step 4: Run existing tests**

Run: `cd kairospayhub-api && dotnet test`  
Expected: all pass (migration applies in `PostgresFixture`)

- [ ] **Step 5: Pause for user review**

---

### Task 3: Meeting type CRUD (pastor only)

**Files:**
- Create: `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceMeetingTypeService.cs`
- Create: `kairospayhub-api/src/KairosPayHub.Api/Controllers/AttendanceController.cs` (initial routes)
- Modify: `kairospayhub-api/src/KairosPayHub.Api/Program.cs` (register services)
- Create: `kairospayhub-api/tests/KairosPayHub.Tests/Integration/AttendanceMeetingTypeApiTests.cs`

**Interfaces:**
- Produces: `POST /api/attendance/meeting-types`, `GET`, `PATCH`
- Consumes: `AttendanceWindowCalculator` when validating type rules

- [ ] **Step 1: Write failing integration test**

```csharp
[Fact]
public async Task Pastor_creates_weekly_sunday_meeting_type_with_open_and_deadline_rules()
{
    var pastor = PastorClient();
    await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Attendance Church" });
    // ... minimal structure seed if needed ...

    var resp = await pastor.PostAsJsonAsync("/api/attendance/meeting-types", new
    {
        title = "Sunday Service",
        recurrenceKind = "Weekly",
        dayOfWeek = "Sunday",
        scopeKind = "ChurchWide",
        opensDayOffset = 0,
        opensTimeUtc = "14:00:00",
        deadlineDayOffset = 1,
        deadlineTimeUtc = "00:00:00",
        autoGenerateWeeksAhead = 8,
    });

    Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
    Assert.Equal("Sunday Service", json.GetProperty("title").GetString());
}
```

- [ ] **Step 2: Run test — expect FAIL** (404)

- [ ] **Step 3: Implement service + controller** — pastor-only guard via `CurrentActor` + role check; validate `opensAt < deadlineAt` using calculator with a sample date

- [ ] **Step 4: Register** `AttendanceMeetingTypeService` in `Program.cs`

- [ ] **Step 5: Run test — expect PASS**

- [ ] **Step 6: Pause for user review**

---

### Task 4: Occurrence auto-generator + scope submission rows

**Files:**
- Create: `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceOccurrenceGenerator.cs`
- Modify: `AttendanceMeetingTypeService.cs` (call generator after create/update)
- Modify: `AttendanceController.cs` — `GET /api/attendance/meeting-types/{id}/occurrences`
- Extend: `AttendanceMeetingTypeApiTests.cs`

**Interfaces:**
- Produces: `AttendanceOccurrenceGenerator.EnsureOccurrencesAsync(Guid meetingTypeId, CancellationToken ct)`
- For `ChurchWide` weekly Sunday type: one occurrence per Sunday in horizon; for each **cell node** with a cell leader assignment, create `AttendanceScopeSubmission` with `LockStatus = NotYetOpen`, `ApprovalStatus = Draft`; eager `AttendanceEntry` stubs (`Unrecorded`) per member in cell

- [ ] **Step 1: Write failing test** — after creating Sunday type, `GET .../occurrences` returns ≥1 occurrence with `status = Scheduled`, `submissionOpensAt` / `submissionDeadlineAt` populated, scope submissions for seeded cell

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement generator** — idempotent on `(MeetingTypeId, MeetingDate)`; walk structure for scope nodes matching meeting type scope; assign leaders from `RoleAssignments`

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Add idempotency test** — call generator twice, occurrence count unchanged

- [ ] **Step 6: Pause for user review — Phase 1 complete**

---

## Phase 2 — Roll call PUT, input window guards, submit

### Task 5: AttendanceScopeService (authorization)

**Files:**
- Create: `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceScopeService.cs`
- Mirror patterns from `GivingScopeService.cs` lines 523–600

**Interfaces:**
- Produces: `ResolveApprovingRoleAsync`, `CanApproveScopeSubmissionAsync`, `ApplyAwaitingMyApprovalFilterAsync`, `CanEditScopeSubmissionAsync`, `CollectSubtreeNodeIdsAsync` (delegate to giving scope or duplicate minimal subset)

- [ ] **Step 1: Write unit/integration tests** for approval role resolution (cell → fellowship, fellowship → PFCC when PFCC managers exist)

- [ ] **Step 2: Implement** — copy chain logic from `ResolveContributionApprovingRoleAsync`

- [ ] **Step 3: Pause for user review**

---

### Task 6: PUT entries + window guards

**Files:**
- Create: `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceSubmissionService.cs`
- Modify: `AttendanceController.cs` — `PUT .../entries`, `GET .../occurrences/{id}`
- Create: `kairospayhub-api/tests/KairosPayHub.Tests/Integration/AttendanceRollCallApiTests.cs`

- [ ] **Step 1: Seed church** (reuse pattern from `ContributionApiTests.cs` — fellowship + cell + member + cell leader)

- [ ] **Step 2: Write failing test — blocked before open**

```csharp
[Fact]
public async Task Cell_leader_cannot_mark_attendance_before_submission_opens()
{
    // Create Sunday type; pick occurrence where SubmissionOpensAt > UtcNow
    // Cell leader PUT entries -> 403 with notYetOpen: true
}
```

- [ ] **Step 3: Implement `CanEditEntriesAsync`** — allow when `LockStatus` is `Editable` or `Reopened` AND `UtcNow >= SubmissionOpensAt` AND `UtcNow < SubmissionDeadlineAt` (or grace deadline if reopened); pastor override flag bypasses lock

- [ ] **Step 4: Write failing test — allowed after open** (freeze time via injectable `TimeProvider` registered in tests)

Register in `Program.cs`: `builder.Services.AddSingleton(TimeProvider.System);` and inject into submission service.

- [ ] **Step 5: Implement PUT** — update entry statuses `Present`/`Absent`; require all members in scope marked before submit (next task)

- [ ] **Step 6: Pause for user review**

---

### Task 7: Submit for approval

**Files:**
- Modify: `AttendanceSubmissionService.cs`
- Modify: `AttendanceController.cs` — `POST .../submit`
- Extend: `AttendanceRollCallApiTests.cs`

- [ ] **Step 1: Failing test** — cell leader marks all members, submits → `approvalStatus = PendingApproval`; second submit before approve → 400

- [ ] **Step 2: Implement** — validate complete roll call; set `SubmittedAt`, `EnteredByRole = CellLeader`

- [ ] **Step 3: PASS + pause for user review — Phase 2 complete**

---

## Phase 3 — Approval chain, submissions API, notifications

### Task 8: Approve / reject

**Files:**
- Modify: `AttendanceSubmissionService.cs`
- Modify: `AttendanceController.cs` — `POST .../approve`, `POST .../reject`
- Create: `kairospayhub-api/tests/KairosPayHub.Tests/Integration/AttendanceApprovalApiTests.cs`

- [ ] **Step 1: Failing test** — mirror `Cell_leader_logs_contribution_fellowship_leader_approves_pastor_sees_rollup` but for attendance scope submission

- [ ] **Step 2: Implement approve** — set `ApprovalStatus = Approved`, audit fields; reject → `Draft` + `Editable` if still in window

- [ ] **Step 3: `GET /api/attendance/submissions`** — filter with `ApplyAwaitingMyApprovalFilterAsync`

- [ ] **Step 4: PASS + pause**

---

### Task 9: Notification kinds + hooks

**Files:**
- Modify: `kairospayhub-api/src/KairosPayHub.Api/Domain/Notifications/NotificationEntities.cs`
- Modify: `kairospayhub-api/src/KairosPayHub.Api/Services/NotificationService.cs`
- Extend: `AttendanceApprovalApiTests.cs` or `NotificationApiTests.cs`

- [ ] **Step 1: Add enum values** — `AttendancePendingApproval`, `AttendanceSubmissionApproved`, `AttendanceSubmissionRejected`, `AttendanceSubmissionMissed`, `AttendanceScopeReopened`, `AttendanceGracePeriodMissed`

- [ ] **Step 2: Add notify methods** — call from submit/approve/reject in `AttendanceSubmissionService`

- [ ] **Step 3: Test** — after cell submit, fellowship leader has notification with link `/attendance/submissions`

- [ ] **Step 4: Pause — Phase 3 complete**

---

## Phase 4 — Deadline worker, excuse, reopen, grace auto-absent

### Task 10: AttendanceDeadlineWorker

**Files:**
- Create: `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceDeadlineWorker.cs`
- Modify: `Program.cs` — `builder.Services.AddHostedService<AttendanceDeadlineWorker>();`
- Create: `kairospayhub-api/tests/KairosPayHub.Tests/Integration/AttendanceDeadlineApiTests.cs`

- [ ] **Step 1: Failing tests** with frozen `FakeTimeProvider`:
  - Before open: `LockStatus = NotYetOpen`
  - After `SubmissionOpensAt`: worker sets `LockStatus = Editable`, occurrence `Scheduled → Open`
  - After deadline with no submit: `LockedMissed` + pastor notification

- [ ] **Step 2: Implement worker** — loop every 2 minutes; also extract `ProcessDeadlinesAsync` callable from GET endpoints

- [ ] **Step 3: PASS + pause**

---

### Task 11: Pastor excuse + window override + reopen + grace absent

**Files:**
- Modify: `AttendanceSubmissionService.cs`
- Modify: `AttendanceController.cs` — `PATCH .../excuse`, `PATCH .../window`, `POST .../reopen`
- Extend: `AttendanceDeadlineApiTests.cs`

- [ ] **Step 1: Excuse test** — excused occurrence skips lock notifications; no PUT allowed for leaders

- [ ] **Step 2: Reopen test** — after `LockedMissed`, pastor reopens with grace deadline; leader can PUT again; after grace with gaps → all `Unrecorded` → `Absent`, `LockedGraceMissed`

- [ ] **Step 3: Pastor override test** — locked scope, pastor PUT succeeds, `ApprovalStatus = Approved`

- [ ] **Step 4: Pause — Phase 4 complete (backend done)**

---

### Task 12: Overall attendance API

**Files:**
- Create: `kairospayhub-api/src/KairosPayHub.Api/Services/AttendanceOverallService.cs`
- Modify: `AttendanceController.cs` — `GET /api/attendance/overall`, `GET /api/attendance/members/{memberId}/history`

- [ ] **Step 1: Failing test** — approved submissions roll up present/absent counts; pending/excised excluded

- [ ] **Step 2: Implement** — ancestor walk from `MemberScopeNodeId` (copy giving rollup approach)

- [ ] **Step 3: PASS + pause**

---

## Phase 5 — Frontend: sidebar, meeting types, submissions

### Task 13: API client + sidebar routes

**Files:**
- Create: `kairospayhub-frontend/src/api/attendance.ts`
- Create: `kairospayhub-frontend/src/lib/attendance-ui.ts`
- Modify: `kairospayhub-frontend/src/lib/sidebar-nav.ts`
- Modify: `kairospayhub-frontend/src/components/layout/app-sidebar.tsx`
- Modify: `kairospayhub-frontend/src/App.tsx`

- [ ] **Step 1: Add types** matching API DTOs (`AttendanceMeetingType`, `AttendanceOccurrence`, `AttendanceScopeSubmission`, `AttendanceEntry`)

- [ ] **Step 2: Add nav group**

```typescript
const ATTENDANCE_NAV_GROUP: NavEntry = {
  kind: 'group',
  label: 'Attendance',
  icon: ClipboardList, // from lucide-react
  children: [
    { to: 'attendance', label: 'Meeting types', end: true },
    { to: 'attendance/submissions', label: 'Submissions', end: true },
    { to: 'attendance/overall', label: 'Overall attendance', end: true },
  ],
}
```

Insert into `NAV`, `SCOPED_LEADER_NAV`, and `LEADER_NAV` with role visibility from spec (hide Overall for non-pastor; hide Submissions for cell leaders).

- [ ] **Step 3: Add routes** — `/attendance`, `/attendance/submissions`, `/attendance/overall`, `/attendance/:typeId/occurrences/:occurrenceId`

- [ ] **Step 4: Add sidebar matchers** — `attendance-meeting-types`, `attendance-submissions`, `attendance-overall`, `attendance-section`

- [ ] **Step 5: Pause for user review**

---

### Task 14: Meeting types page + occurrence roll-call page

**Files:**
- Create: `kairospayhub-frontend/src/pages/AttendanceMeetingTypesPage.tsx`
- Create: `kairospayhub-frontend/src/pages/AttendanceOccurrencePage.tsx`
- Create: `kairospayhub-frontend/src/components/attendance/meeting-types-table.tsx`
- Create: `kairospayhub-frontend/src/components/attendance/roll-call-sheet.tsx`
- Create: `kairospayhub-frontend/src/components/attendance/create-meeting-type-dialog.tsx` (pastor)

- [ ] **Step 1: Meeting types list** — pastor create dialog (title, day, scope, opens/deadline fields); leaders see types + occurrence list

- [ ] **Step 2: Roll-call sheet** — Scheduled banner + disabled controls before open; Present/Absent toggles when open; Save draft + Submit for approval buttons; show `submissionOpensAt` / `submissionDeadlineAt` in GMT

- [ ] **Step 3: Manual smoke test** on local dev servers

- [ ] **Step 4: Pause for user review**

---

### Task 15: Submissions page

**Files:**
- Create: `kairospayhub-frontend/src/pages/AttendanceSubmissionsPage.tsx`
- Create: `kairospayhub-frontend/src/components/attendance/attendance-submissions-table.tsx`
- Create: `kairospayhub-frontend/src/components/attendance/attendance-submission-detail-modal.tsx`

- [ ] **Step 1: Mirror** `TransactionsPage.tsx` + `contributions-approval-table.tsx` — columns from spec; approve/reject with reason

- [ ] **Step 2: Wire notifications** link to `/attendance/submissions`

- [ ] **Step 3: Pause — Phase 5 complete**

---

## Phase 6 — Overall attendance + member history

### Task 16: Overall attendance page

**Files:**
- Create: `kairospayhub-frontend/src/pages/OverallAttendancePage.tsx`
- Create: `kairospayhub-frontend/src/components/attendance/overall-attendance-metrics.tsx`
- Create: `kairospayhub-frontend/src/components/attendance/attendance-structure-drilldown.tsx`

- [ ] **Step 1: Pastor-only route guard** (same pattern as `OverallGivingsPage`)

- [ ] **Step 2: Metrics** — approved present %, missing submitters highlight

- [ ] **Step 3: Structure drill-down** — PFCC → fellowship → cell

- [ ] **Step 4: Pause for user review**

---

### Task 17: Member Records tab

**Files:**
- Modify: `kairospayhub-frontend/src/components/structure/member-detail-sheet.tsx`
- Create: `kairospayhub-frontend/src/components/attendance/member-attendance-history.tsx`

- [ ] **Step 1: Replace placeholder** in Records tab with history table from `GET /api/attendance/members/{id}/history`

- [ ] **Step 2: Show auto-absent badge** when `autoMarkedAbsentAt` set

- [ ] **Step 3: Final smoke test + restart dev servers**

- [ ] **Step 4: Pause — feature complete pending user sign-off**

---

## Spec self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Auto-generated occurrences | Task 4 |
| Input window (not before meeting day/service) | Tasks 1, 6, 10, 14 |
| Approval chain like givings | Tasks 5, 8, 15 |
| Submissions + Overall sidebar paths | Task 13 |
| Deadline lock + pastor notify | Task 10 |
| Grace reopen + auto-absent | Task 11 |
| Excused occurrence | Task 11 |
| Member history (approved only) | Tasks 12, 17 |
| Notifications | Task 9 |
| Eager entry stubs | Task 4 |

**Resolved from spec open items:**
- Reuse `ProgramScopeKind` values as `AttendanceMeetingScopeKind` (same string names in API).
- Eager stubs at occurrence generation (Task 4).

---

## Verification commands

```bash
# Backend
cd kairospayhub-api && dotnet test

# Frontend typecheck
cd kairospayhub-frontend && npm run build
```

After each phase, run full test suite before requesting user review.
