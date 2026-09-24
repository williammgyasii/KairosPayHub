## Purpose

Lets an allowlisted operator search an area for churches and see only the ones whose website publishes an email address.

## ADDED Requirements

### Requirement: Operator allowlist
The system SHALL allow `/superadmin` and the outreach API only for an account stored in the superadmin operator table. The initial account MUST be `william@kairospayhub.com`. A church session MUST NOT grant this access, including when the church email matches an operator email.

#### Scenario: Operator account opens the page
- **WHEN** an operator who signed in through the superadmin table requests `/superadmin`
- **THEN** the system shows the outreach page

#### Scenario: Church pastor is refused
- **WHEN** a signed-in church pastor requests the outreach API
- **THEN** the system refuses the request

#### Scenario: Anonymous caller is refused
- **WHEN** a request with no signed-in user hits the outreach API
- **THEN** the system refuses the request

### Requirement: Operator door
The system SHALL sign operators in at `/superadmin/login` against the superadmin operator table. An anonymous visit to `/superadmin` SHALL show that sign-in. A successful sign-in SHALL open the outreach page and SHALL NOT open the church dashboard.

#### Scenario: Anonymous visitor opens outreach
- **WHEN** an anonymous visitor requests `/superadmin`
- **THEN** the system shows the operator sign-in at `/superadmin/login`

#### Scenario: Operator signs in at the operator door
- **WHEN** `william@kairospayhub.com` signs in at `/superadmin/login` with the password stored on the superadmin operator row
- **THEN** the system shows the outreach page

### Requirement: Area search returns churches
The system SHALL search for Christian places of worship around an area the operator supplies. Each result the system keeps for scouting MUST include the church name and website when the place search provides them.

#### Scenario: Operator searches an area
- **WHEN** an allowlisted operator submits an area
- **THEN** the system returns churches in that area that have a website

#### Scenario: City and state is a place, not a street
- **WHEN** the operator submits a US city and state such as Columbus, OH
- **THEN** the system locates that place and searches around it

#### Scenario: ZIP code locates the area
- **WHEN** the operator submits a US ZIP code
- **THEN** the system locates that ZIP code and searches around it

### Requirement: Contact page email
The system SHALL read the church contact page, then the homepage if the contact page has no email. It MUST decode HTML character references before looking for an address. It MUST NOT invent an address from the domain name.

#### Scenario: Contact page hides the address in HTML character references
- **WHEN** a contact page contains the published address only as HTML character references for `info@madisonchristian.org`
- **THEN** the system records `info@madisonchristian.org`

#### Scenario: Contact page has no address
- **WHEN** the contact page and the homepage load and neither contains a published email
- **THEN** the system does not add that church to the sendable list

#### Scenario: Website does not load
- **WHEN** the church website cannot be fetched
- **THEN** the system does not add that church to the sendable list

### Requirement: Prefer the church domain
When a page contains more than one email address, the system SHALL prefer an address on the church website's own domain.

#### Scenario: Page lists the church office and another domain
- **WHEN** a page contains both `office@thechurch.example` and an address on a different domain
- **THEN** the system keeps `office@thechurch.example`

### Requirement: Sendable list has no duplicates
The system SHALL show the operator a list of churches that have a found email. Searching the same church again MUST NOT create a second row.

#### Scenario: Same church is found twice
- **WHEN** a later search returns a church already stored by place id
- **THEN** the system keeps one row and refreshes the email when a new address was found

### Requirement: State and city scout
The outreach page SHALL ask for a US state and a city. Allowing the browser location permission SHALL fill that state and city. Scouting SHALL search a 25-mile radius around the city.

#### Scenario: Operator scouts a city in a state
- **WHEN** the operator chooses Ohio, enters Columbus, and scouts
- **THEN** the system searches around Columbus, Ohio

#### Scenario: Location permission fills the form
- **WHEN** the operator allows location and that position is in Columbus, Ohio
- **THEN** the state is Ohio and the city is Columbus

### Requirement: Lead desk
The system SHALL keep each church with a published email as a lead on the outreach page. A new lead SHALL start as Scouted. The operator SHALL be able to mark a lead Responded or Converted. A church session MUST NOT list or change leads.

#### Scenario: Saved church starts as Scouted
- **WHEN** a search stores a church
- **THEN** the lead list shows that church as Scouted

#### Scenario: Operator marks a lead converted
- **WHEN** the operator marks a saved lead Converted
- **THEN** the lead list shows that church as Converted

#### Scenario: Church session cannot change a lead
- **WHEN** a church session lists or updates leads
- **THEN** the system refuses the request

### Requirement: Reach out from a saved lead
The system SHALL send a message the operator writes to a saved church through the operator mailbox. The message From and Reply-To addresses SHALL be that mailbox. The system MUST NOT read the inbox. The operator SHALL mark the lead Success, Failure, or Converted by hand. A send SHALL record that the church was reached.

#### Scenario: Operator reaches a saved church
- **WHEN** the operator sends a subject and message to a saved lead
- **THEN** the message goes to the church email from the operator mailbox and the lead shows it was reached

#### Scenario: Operator records the outcome by hand
- **WHEN** the operator marks a reached lead Success, Failure, or Converted
- **THEN** the saved lead shows that outcome
