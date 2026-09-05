## ADDED Requirements

### Requirement: Contributions default to church currency

When a contribution is created without an explicit currency, the system SHALL use the church tenant's `DefaultCurrency`.

#### Scenario: Contribution uses church default

- **WHEN** a user logs a contribution without specifying currency and the church default is `CAD`
- **THEN** the stored contribution currency is `CAD`

#### Scenario: Explicit currency is preserved

- **WHEN** a user logs a contribution with currency `USD` and the church default is `CAD`
- **THEN** the stored contribution currency remains `USD`

#### Scenario: Legacy churches without country keep GHS default

- **WHEN** a church tenant has no `CountryCode` and `DefaultCurrency` is unset or `GHS`
- **THEN** contributions without explicit currency continue to default to `GHS`
