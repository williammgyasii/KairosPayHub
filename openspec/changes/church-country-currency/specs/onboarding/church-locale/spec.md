## Purpose

Lets pastors declare where their church operates so KairosPayHub stores the correct default currency for giving and reporting.

## ADDED Requirements

### Requirement: Pastor selects country during church onboarding

The onboarding church-details step SHALL require a country selection before the pastor can continue to structure setup.

#### Scenario: Country is required

- **WHEN** a pastor submits church details without a country
- **THEN** the API returns a validation error and the frontend shows that country is required

#### Scenario: Country is saved on the church tenant

- **WHEN** a pastor completes church details with country code `CA`
- **THEN** the created church tenant stores `CountryCode = CA` and a derived default currency

### Requirement: Default currency is derived from country

The system SHALL map the selected ISO 3166-1 alpha-2 country code to a single ISO 4217 currency code using a server-side lookup table.

#### Scenario: Canada maps to CAD

- **WHEN** onboarding completes with country `CA`
- **THEN** the church tenant `DefaultCurrency` is `CAD`

#### Scenario: Ghana maps to GHS

- **WHEN** onboarding completes with country `GH`
- **THEN** the church tenant `DefaultCurrency` is `GHS`

#### Scenario: United States maps to USD

- **WHEN** onboarding completes with country `US`
- **THEN** the church tenant `DefaultCurrency` is `USD`

#### Scenario: Unsupported country is rejected

- **WHEN** onboarding is submitted with a country code not in the supported list
- **THEN** the API returns a validation error explaining the country is not supported

### Requirement: Me endpoint exposes church locale

The authenticated `/api/me` response for onboarded users SHALL include `countryCode` and `defaultCurrency` when a church tenant exists.

#### Scenario: Pastor sees church currency after onboarding

- **WHEN** an onboarded pastor requests `/api/me`
- **THEN** the response includes their church `countryCode` and `defaultCurrency`
