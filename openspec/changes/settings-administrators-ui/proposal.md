## Why

The Administrators settings page uses a side-by-side layout with ad-hoc form state. Pastors need a clearer add flow (react-hook-form) and a collapsible list of active administrators under the form.

## What Changes

- Stack layout: Add administrator form on top; collapsible Administrators table below (default open) with Active/Disabled status.
- Convert the create form to react-hook-form with the shared Form field components.
- Active table lists only `isActive` administrators; deactivate removes them from this list after refresh.
- Tighten affiliation handling so UI/API prefer the affiliation enum (no ad-hoc string gates beyond parse).

## Capabilities

### New Capabilities

- `settings/administrators`: Administrators settings form + full list with Active/Disabled status.

### Modified Capabilities

- (none)

## Impact

- Frontend: `SettingsAdministratorsPage`, possibly small affiliation label helper + tests.
- Backend: light cleanup in `ChurchAdministratorService` affiliation parsing (behavior unchanged).
