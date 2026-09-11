## Purpose

Defines the flat Settings tab bar by role and legacy `/account` URL redirects so Profile, Security, and Notifications sit at the top level with Administrators for church managers. Church logo lives on the Profile page (not a separate tab).

## ADDED Requirements

### Requirement: Flat Settings tabs for church managers

Church managers (Pastor / ChurchAdmin) SHALL see a single Settings tab bar with, in order: Profile, Security, Notifications, Administrators. There SHALL NOT be a separate Church profile or Branding tab. Nested Account sub-tabs SHALL NOT appear.

#### Scenario: Pastor opens Settings

- **WHEN** a church manager opens Settings
- **THEN** the top-level tabs are Profile, Security, Notifications, and Administrators
- **AND** there is no Church profile / Branding tab
- **AND** there is no second row of Account tabs

### Requirement: Flat Settings tabs for non–church-managers

Users who cannot manage the church SHALL see only Profile, Security, and Notifications in the Settings tab bar. They SHALL NOT see Administrators.

#### Scenario: Member opens account settings

- **WHEN** a non–church-manager opens Settings (or the former Account area)
- **THEN** the tabs are Profile, Security, and Notifications only

### Requirement: Legacy account URL redirects

Legacy account paths SHALL redirect to the flattened Settings routes without losing the intended page.

#### Scenario: Old account URLs still work

- **WHEN** a user navigates to `/account`
- **THEN** they are redirected to `/settings/profile`
- **WHEN** a user navigates to `/account/security`
- **THEN** they are redirected to `/settings/security`
- **WHEN** a user navigates to `/account/notifications`
- **THEN** they are redirected to `/settings/notifications`

### Requirement: Settings default is Profile

The Settings index and former branding routes SHALL land on Profile.

#### Scenario: User opens Settings root or branding

- **WHEN** a user navigates to `/settings` or `/settings/branding`
- **THEN** they are redirected to `/settings/profile`
