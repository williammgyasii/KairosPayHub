## Purpose

How a roster actor registers a person: which questions appear, what is required, and how the form follows the church — not a hard-coded Ghana phone or a new-vs-returning branch.

## ADDED Requirements

### Requirement: Create wizard does not ask new-to-church
The add-member create flow SHALL NOT ask whether the person is new to the church. Responsiveness MAY default without that question.

#### Scenario: Cell leader opens Add member
- **WHEN** they open the create wizard
- **THEN** there is no “new to the church” prompt
- **AND** they can continue without choosing new vs returning

### Requirement: Birthday is required on the personal step
Date of birth SHALL be required. It SHALL appear on the step after name/contact, not on the first step.

#### Scenario: Birthday is on the next step
- **WHEN** they complete the details step
- **THEN** the next step asks for date of birth
- **AND** they cannot finish that step without a date of birth

### Requirement: Email is optional for ordinary members
Email SHALL remain on the form but SHALL NOT be required when registering a non-leader. If an email is entered, it SHALL still be validated.

#### Scenario: Member without email
- **WHEN** they add a member with a name and birthday and no email
- **THEN** the member is created

### Requirement: Phone defaults to the church country
An empty phone field SHALL default its country/dial code from the church `countryCode`.

#### Scenario: US church add member
- **WHEN** the church country is US
- **AND** they open Add member
- **THEN** the phone country control defaults to the United States dial code
