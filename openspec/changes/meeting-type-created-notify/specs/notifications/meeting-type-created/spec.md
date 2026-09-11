## Purpose

Leaders and admins learn in-app when a pastor adds a meeting type, without email and without notifying people who have no login.

## ADDED Requirements

### Requirement: Create meeting type notifies leaders and admins

When a pastor or church admin creates a meeting type, the system SHALL create an in-app notification for every other pastor, church administrator, and unit leader assigned in that church. The creator MUST NOT receive that notification. Roster members without a leadership or admin login MUST NOT receive it. Edit and delete MUST NOT send this notification.

#### Scenario: Cell leader and admin are notified

- **WHEN** a pastor creates a meeting type titled Sunday Service
- **AND** the church has a cell leader and a church administrator with logins
- **THEN** the cell leader’s inbox has an unread MeetingTypeCreated notification naming Sunday Service
- **AND** the administrator’s inbox has the same kind
- **AND** the notification opens Attendance submissions

#### Scenario: Creator is not notified

- **WHEN** a pastor creates a meeting type
- **THEN** that pastor’s unread count for this event is zero

#### Scenario: Edit does not notify

- **WHEN** a pastor changes an existing meeting type’s title
- **THEN** no new MeetingTypeCreated notification is created
