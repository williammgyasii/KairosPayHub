## Purpose

Defines how church managers set the church logo on the Profile settings page so the same mark appears in the workspace sidebar (and other surfaces that use `churchLogoUrl`).

## ADDED Requirements

### Requirement: Logo preview on Profile for church managers

Church managers SHALL see a Church section on the Settings Profile page that previews the church logo using the same image (or initials fallback) as the sidebar church mark. Non–church-managers SHALL NOT see this section.

#### Scenario: Existing logo shown on Profile

- **WHEN** a church manager opens Settings → Profile and the church has a logo URL
- **THEN** the page shows that logo in an avatar-style preview consistent with the sidebar mark
- **AND** the preview is not the full sidebar brand chip (name + “Church workspace” chrome)

#### Scenario: Non-manager Profile has no church logo controls

- **WHEN** a non–church-manager opens Settings → Profile
- **THEN** church logo upload controls are not shown

### Requirement: Editable church name on Profile

Church managers SHALL be able to edit and save the church name from Settings → Profile using the same view/edit pattern as personal profile fields. Default currency SHALL remain read-only.

#### Scenario: Pastor renames church

- **WHEN** a church manager clicks Edit church, changes the name, and saves
- **THEN** the church name is persisted
- **AND** session identity is refreshed so the sidebar shows the new name

#### Scenario: Currency is not editable here

- **WHEN** a church manager views or edits church fields on Profile
- **THEN** default currency is shown as read-only

### Requirement: Upload updates church logo everywhere

Church managers SHALL be able to upload a JPEG, PNG, or WebP logo (within the existing size limit) from Profile. On success, the new logo URL SHALL persist and refresh session identity so the sidebar updates without a full page reload.

#### Scenario: Successful logo upload

- **WHEN** a church manager selects a valid logo file on Profile
- **THEN** the server stores the logo and returns its public URL
- **AND** the Profile preview shows the new logo
- **AND** after session identity is refreshed, the sidebar church mark shows the same logo

#### Scenario: Upload rejected with a clear error

- **WHEN** upload fails (invalid type/size, unauthorized, or storage not configured)
- **THEN** the page shows an error message
- **AND** the previous logo preview remains unchanged
