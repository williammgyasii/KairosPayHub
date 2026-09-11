## Why

Unit leaders need to rename their own unit from the units ⋯ menu, without church-manager powers (leadership / delete / unit number).

## What Changes

- API: scoped unit leaders may update **name only** on their assigned scope node; managers keep full update.
- FE: `unitEditPolicy` drives Edit in the units menu; rename-only form for leaders; full edit for managers.
- Wire Edit on the main units list (was missing even for managers).

## Capabilities

### New Capabilities

- `structure/unit-scoped-rename`: Leaders rename their own unit; managers retain full edit.

### Modified Capabilities

- (none)

## Impact

- `StructureNodeService.UpdateNodeAsync`, FE roster menus + unit form sheet, integration + unit tests
