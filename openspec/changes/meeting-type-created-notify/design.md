## Context

See proposal.md. `NotificationEngine` already persists inbox rows and SignalR. Church-wide campaign fan-out already lists pastors plus every `role_assignments` row that is not `Member`. Meeting-type create lives in `AttendanceMeetingTypeService` and currently stops after occurrences.

`NotificationService` is already over the service line limit. Do not append another composer there.

## Goals / Non-Goals

**Goals:**

- Recipient manager: all pastors, `ChurchAdmin`, and unit leaders on that church; exclude creator.
- Sibling notifier calls the engine. Create path calls the notifier after save.
- Link `attendance/submissions` (leaders can open it; `/attendance` is pastor-only).

**Non-Goals:**

- Email / SMS.
- Notify on edit, delete, or occurrence generate.
- Notify roster members with no login.

## Decisions

### 1. Recipient list is church-wide staff, not submission-layer only

Approved: every leader and admin. Reuse the same set as church-wide calendar/campaign recipients (`Role != Member`, drop creator).

**Alternative:** only leaders on the meeting type’s submission layer — fewer bells, rejected.

### 2. Sibling service, not another 40 lines on NotificationService

`MeetingTypeNotificationService` + `NotificationRecipientResolver.ForChurchLeadersAndAdminsAsync`. Create injects the sibling.

### 3. New `NotificationKind.MeetingTypeCreated`

Inbox API already serializes kind as a string. Frontend union adds the value; the bell renders `title` / `body`.

## Risks / Trade-offs

- [Large churches, many leaders] → One row per recipient, same as campaign opened. Acceptable for v1.
- [Creator is also the only pastor] → Inbox stays quiet for them; they just left the form.
