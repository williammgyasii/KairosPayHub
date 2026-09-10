## Why

Pending contribution (and related) in-app notifications resolve recipients with a hardcoded Cell → Fellowship hop, separate from approve. On Church → Cell churches the pastor can approve but gets no bell. `NotificationService` also mixes inbox CRUD, copy, recipient policy, and delivery (~950+ lines), so channels and structure policy keep drifting.

## What Changes

- One **structure-aware approval / recipient manager** shared by approve and notify (skip layers the church does not have).
- A **notification engine** that only persists in-app rows and pushes SignalR (email later as another channel).
- **Composers** per domain (giving / attendance / calendar) that build kind, title, body, link, then ask the manager for recipients and call the engine.
- Thin **inbox** service for list / unread / mark-read (behavior unchanged).
- All existing `NotificationKind` values keep working through the gateway; v1 is **in-app only**.

## Capabilities

### New Capabilities

- `notifications/gateway`: In-app notification delivery via engine; structure-aware recipients for pending approval; composers cover existing kinds without changing inbox API shape.

### Modified Capabilities

- (none under `openspec/specs/` yet)

## Impact

- **API**: Split `NotificationService`; wire contribution/attendance pending notify to shared hop; DI registrations; call sites keep `Notify*` names where practical.
- **Tests**: Church → Cell cell log notifies pastor; Fellowship → Cell still notifies fellowship leader; existing notification integration tests stay green.
- **Frontend**: No required UI change (bell / SignalR unchanged).
