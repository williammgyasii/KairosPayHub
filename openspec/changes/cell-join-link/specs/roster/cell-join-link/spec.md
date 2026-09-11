## Purpose

Lets a deepest-unit leader share an expiring join link or QR so people enter their own vitals and wait for accept, instead of the leader typing them in.

## ADDED Requirements

### Requirement: Deepest-unit leader mints an expiring join link

A leader whose scope is a unit on the deepest template layer SHALL be able to create one active join token for that unit. They MUST choose 1, 7, or 30 days. The product SHALL offer the same URL as a copyable link and a QR code. Creating a new token MUST invalidate the previous one for that unit. Actors who are not scoped to a deepest-layer unit MUST NOT mint a join token. After expiry or rotate, a submit MUST be rejected with a message to ask the leader for a new link.

#### Scenario: Cell leader generates a seven-day link

- **WHEN** a deepest-layer leader generates a join link and chooses 7 days
- **THEN** they receive a URL and QR for that unit
- **AND** the token expires after 7 days

#### Scenario: Mid-layer leader cannot generate

- **WHEN** a fellowship (or other non-deepest) leader tries to mint a join token
- **THEN** the request is rejected
- **AND** Membership does not offer Generate join link

#### Scenario: New token replaces the old one

- **WHEN** the leader generates again while a token is still live
- **THEN** the previous URL and QR stop working
- **AND** the new URL works until its own expiry

### Requirement: Public form creates a pending member

An unauthenticated person SHALL open `/join/{token}` and submit name, required email, required phone, required birthday, and church-country address. The public form SHALL lay those fields out in a two-column grid. Phone defaults to the church country dial code. Address fields follow `profileAddressPolicy` (Home address label; US State dropdown required; other countries optional State / region text). The system SHALL create a member on that unit with pending status and no login. An expired or unknown token MUST NOT create a member. Deepest-layer leaders MUST NOT use Add member to type a person in; they use this link instead. Church-wide and mid-layer actors keep Add member.

If the submitted email is already on that church’s roster, the system SHALL respond as a successful submit and MUST NOT create another row or say that the email is already a member. A unit SHALL reject further public submits once it has 25 pending members. Public submit MUST be rate-limited per token so a leaked link cannot flood the church.

#### Scenario: Valid token submits vitals

- **WHEN** a person opens a live join URL and submits valid vitals
- **THEN** that cell’s membership lists them as Pending
- **AND** they have no app account
- **AND** they see an animated success screen naming the unit and church

#### Scenario: Expired token is rejected

- **WHEN** they open or submit an expired or rotated token
- **THEN** they see that they must ask their leader for a new link
- **AND** no member row is created

#### Scenario: Existing roster email is not an oracle

- **WHEN** they submit a live join form using an email already on that church’s roster
- **THEN** the response looks like a successful submit
- **AND** no additional member row is created
- **AND** the response does not say the email is already on the roster

#### Scenario: Pending cap and rate limit stop a flood

- **WHEN** a live token is used to submit more than 25 pending members for that unit, or more than 5 submits in an hour
- **THEN** further submits are rejected
- **AND** the public copy does not confirm whether an email is on the roster

### Requirement: Leader accepts or declines pending members

Membership SHALL show pending rows with Accept and Decline. Deepest-scope leaders SHALL have a Pending members control next to Generate join link that lists only pending joiners. Pending and recently added members SHALL sort above the rest of the table; recent joiners SHALL show a New mark next to their name. Structure columns SHALL still show ancestor unit names (for example a cell leader still sees their fellowship). Accept MUST make the person an active member on that unit without creating a login. Decline MUST remove the pending row. Pending people MUST NOT be included in attendance or giving member counts.

#### Scenario: Accept promotes the person

- **WHEN** the unit leader accepts a pending member
- **THEN** the row is an ordinary member on that unit
- **AND** they still have no login

#### Scenario: Decline removes the pending row

- **WHEN** the unit leader declines a pending member
- **THEN** the person is no longer on the roster

#### Scenario: Pending tab and new mark

- **WHEN** a deepest-scope leader opens Membership after someone submitted the join form
- **THEN** Pending members next to Generate join link lists that person
- **AND** the main membership table also shows them at the top with a Pending or New mark
- **AND** their fellowship (or other ancestor unit) name is filled in, not a dash
