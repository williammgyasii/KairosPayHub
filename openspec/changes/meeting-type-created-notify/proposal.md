## Why

When a pastor adds a meeting type, leaders only find out by opening Attendance. They need the same in-app trickle-down the church already uses for a new giving campaign.

## What Changes

- Creating a meeting type writes an in-app notification to every pastor, church admin, and unit leader in that church.
- The creator is skipped. Roster-only members (no login) are not notified.
- Edit and delete do not notify. Email is out of scope.

## Capabilities

### New Capabilities

- `notifications/meeting-type-created`: In-app bell when a meeting type is created; recipients are church leaders and admins.

### Modified Capabilities

- (none)

## Impact

- **API**: new `NotificationKind`, notify after meeting-type create, recipient list from role assignments.
- **Frontend**: add the kind to the notification union; bell already shows title/body.
- **Tests**: create as pastor → cell leader and admin have a row; creator does not.
