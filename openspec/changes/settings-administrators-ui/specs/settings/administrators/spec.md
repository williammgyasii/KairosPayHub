## Purpose

Defines the Settings Administrators experience: create church administrators via a structured form, and review or disable administrators in a collapsible table that keeps history with an Active/Disabled status.

## ADDED Requirements

### Requirement: Add administrator form above the list

The Administrators settings page SHALL present an Add administrator form above the administrators list. The form SHALL collect first name, last name, email, affiliation, and either a password or a send-invite option.

#### Scenario: Pastor opens Administrators

- **WHEN** a church manager opens Settings → Administrators
- **THEN** the Add administrator form is visible at the top of the page
- **AND** the Administrators section appears below the form

### Requirement: Collapsible administrators table with status

Administrators SHALL be shown in a collapsible table that is expanded by default. The table SHALL include both active and disabled administrators. Each row SHALL show status as Active or Disabled. Disabling an administrator SHALL keep the row in the table with Disabled status (login remains blocked).

#### Scenario: List starts expanded and shows status

- **WHEN** a church manager opens Administrators and administrators exist
- **THEN** the Administrators section is expanded
- **AND** each row shows name, email, affiliation, and Active or Disabled status
- **AND** active rows offer a Disable action

#### Scenario: Collapse hides the table

- **WHEN** the church manager collapses Administrators
- **THEN** the table body is hidden
- **AND** the section header remains available to expand again

#### Scenario: Disable keeps the row

- **WHEN** the church manager disables an active administrator
- **THEN** that administrator remains in the table
- **AND** their status shows Disabled
- **AND** they no longer have a Disable action

### Requirement: Deactivated administrators cannot sign in

When a church administrator is deactivated, their login SHALL be blocked and they SHALL NOT retain church-manager access via leftover role or legacy user rows.

#### Scenario: Deactivated admin cannot log in

- **WHEN** a church manager deactivates an administrator
- **THEN** that administrator’s email/password login is rejected
- **AND** they no longer resolve as a church manager for API access
