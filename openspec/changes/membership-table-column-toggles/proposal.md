## Why

The membership table shows a fixed (or all-or-nothing extended) set of columns. Pastors need to show profile fields already stored on members (state, DOB, workplace, etc.) without permanently widening the table.

## What Changes

- Membership (and unit roster member tables that use the same table) gain a Columns control like Attendance.
- Toggleable columns include all profile fields we already store, plus role, responsiveness, and each structure layer.
- Name stays always visible; sensible defaults keep the table readable.
- No API changes — data is already on member list responses / tree members.

## Capabilities

### New Capabilities

- `roster/membership-column-visibility`: Users can show or hide membership table columns for stored profile and structure fields.

### Modified Capabilities

- (none)

## Impact

- Frontend: `StructureMemberTable`, `MemberTableToolbar` / membership view wiring, small column-visibility helper + unit tests
- No backend or migration work
