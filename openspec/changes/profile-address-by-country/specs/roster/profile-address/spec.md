## Purpose

Member address fields follow the church country: US churches collect a state and call the street field home address; other churches keep a single residence field.

## ADDED Requirements

### Requirement: Address fields follow church country

Address labels and whether a state control appears SHALL come from the church `countryCode`. Screens MUST NOT compare country names or codes to decide which fields to show.

#### Scenario: US church shows state and home address

- **WHEN** the church country is US
- **AND** a member profile form is shown (including the create-unit leader step)
- **THEN** a State dropdown is visible
- **AND** the street field is labeled Home address

#### Scenario: Ghana church keeps residence and hides state

- **WHEN** the church country is GH
- **AND** a member profile form is shown
- **THEN** there is no State dropdown
- **AND** the street field is labeled Residence / location

### Requirement: State is stored separately from home address

When a state is collected, the system SHALL persist it as its own value. The home-address / residence value MUST NOT be required to include the state abbreviation.

#### Scenario: US leader save keeps state and address apart

- **WHEN** a US church saves a new unit leader with home address “12 Oak St” and state “MD”
- **THEN** the member record stores those as separate fields
- **AND** a later read returns state MD and residence “12 Oak St”

### Requirement: Required leader profile includes state when the country shows it

When the form requires a complete leader profile and the church country shows a state field, the system SHALL NOT treat the profile as complete until a state is chosen.

#### Scenario: US cell leader cannot continue without state

- **WHEN** the church country is US
- **AND** they are on the create-unit leader step
- **AND** email, phone, and date of birth are filled
- **AND** no state is selected
- **THEN** they cannot continue to the next step or submit

### Requirement: Student and working collects school and workplace separately

When occupation is student and working, the system SHALL show two fields: school and workplace. It MUST NOT use a single combined school-or-workplace field for that status.

#### Scenario: Student and working shows both fields

- **WHEN** they choose Student & working on a member profile form
- **THEN** a School field and a Workplace field are both visible
- **AND** saving stores school and workplace as separate values

### Requirement: Not working is persisted as unemployed

Choosing not working / unemployed SHALL persist occupation status as Unemployed. School and workplace SHALL be empty for that status.

#### Scenario: Unemployed leader keeps that status

- **WHEN** they choose Not working / Unemployed
- **AND** they save the member or unit leader
- **THEN** the record’s occupation status is Unemployed
- **AND** school and workplace are empty
