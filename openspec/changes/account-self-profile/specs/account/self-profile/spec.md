## Purpose

Lets a signed-in person who already has a roster row edit their own profile from Account, and keeps those fields identical everywhere the church already shows a member.

## ADDED Requirements

### Requirement: Me payload includes roster profile fields

When the actor has a `church_members` row linked by login, `GET /api/me` SHALL include that row's name, phone, date of birth, residence, occupation status, and school or workplace. Email SHALL remain the login email. When there is no linked row, those profile fields SHALL be null and name MAY stay the login display name.

#### Scenario: Cell leader sees their birthday on me

- **WHEN** a cell leader with a linked roster row calls `GET /api/me`
- **THEN** the response includes their `dateOfBirth` and other profile fields from that row
- **AND** `email` is their login email

#### Scenario: Login without a roster row

- **WHEN** a pastor (or other login) has no linked `church_members` row
- **AND** they call `GET /api/me`
- **THEN** profile fields are null
- **AND** the request still succeeds

### Requirement: Actor can update their own roster profile

`PATCH /api/me` SHALL update the linked `church_members` row's name, phone, date of birth, residence, occupation status, and school or workplace. The system MUST ignore any email in the body. The system MUST NOT change role, church, or parent unit. After a successful patch, roster, member detail, and calendar birthday views SHALL show the new values without a second write.

#### Scenario: Cell leader updates birthday

- **WHEN** a cell leader with a linked roster row sends `PATCH /api/me` with a new date of birth
- **THEN** that member row is updated
- **AND** `GET /api/me` returns the new date
- **AND** a later member read for that id returns the same date

#### Scenario: Email in the body is ignored

- **WHEN** the actor sends `PATCH /api/me` with a different email
- **THEN** the login email and member email are unchanged
- **AND** the other submitted profile fields are saved

#### Scenario: No linked roster row

- **WHEN** the actor has no linked `church_members` row
- **AND** they send `PATCH /api/me`
- **THEN** the system rejects the request
- **AND** no new member row is created

### Requirement: Account is split into profile, security, and notifications

The product SHALL present Account as three pages: Profile, Security, and Notifications. Profile SHALL be editable when a linked roster row exists. Security SHALL offer password reset. Notifications MAY remain a coming-soon placeholder.

#### Scenario: Cell leader opens Account

- **WHEN** a cell leader opens Account
- **THEN** they land on Profile in view mode with their roster fields visible
- **AND** they can choose Edit to change those fields
- **AND** they can navigate to Security and Notifications as separate pages

#### Scenario: Profile save stays on Profile

- **WHEN** they save Profile
- **THEN** a success confirmation is shown
- **AND** they return to view mode with the saved values
- **AND** they are not sent to Security or Notifications
