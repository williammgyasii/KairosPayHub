## Purpose

In-app notifications are delivered through one engine. Who receives pending-approval alerts follows the same structure-aware hop as approve (skip layers the church does not have). Inbox list/read APIs stay the same.

## ADDED Requirements

### Requirement: Pending contribution notify matches approve hop

When a contribution needs approval, in-app notification recipients SHALL be the people who may approve that contribution under the church’s structure (same next hop as approve). The system MUST NOT hardcode Cell → Fellowship when the template has no Fellowship layer.

#### Scenario: Church → Cell notifies pastor

- **WHEN** the church template has Cell but no Fellowship or PFCC
- **AND** a cell leader logs a contribution that needs approval
- **THEN** each pastor for that church receives an in-app `ContributionPendingApproval` notification
- **AND** the contribution’s pending approver role is Pastor

#### Scenario: Fellowship → Cell still notifies fellowship leadership

- **WHEN** the church template includes Fellowship
- **AND** a cell leader logs a contribution that needs approval
- **THEN** fellowship leaders whose scope covers the member receive the pending notification
- **AND** the pending approver role is FellowshipLeader

### Requirement: Pending attendance notify skips missing layers

Roll-call pending approval notifications SHALL notify the next leadership that exists on the church template (and assignments), not an empty set when Fellowship is absent.

#### Scenario: Church → Cell attendance notifies pastor

- **WHEN** the church template has Cell but no Fellowship
- **AND** a cell leader submits roll call for approval
- **THEN** pastors receive an in-app `AttendancePendingApproval` notification

### Requirement: Delivery goes through one in-app engine

Creating notifications for any existing kind SHALL persist rows and push realtime through one delivery path. Email is out of scope for this capability. Inbox list, unread count, and mark-read behavior SHALL remain unchanged for clients.

#### Scenario: Existing kinds still create inbox rows

- **WHEN** any existing notification kind is fired (campaign opened, sub-giving pending/reviewed, contribution reviewed, attendance reviewed, calendar event/birthday)
- **THEN** matching recipients receive in-app notifications with the same kind values clients already understand
