## Context

See proposal.md for why. Member profile today has one `Residence` string. `MemberProfileFields` is the shared engine for Add member, create-unit leader, and (later) account. Church `countryCode` already drives phone default via `phoneCountryForCode`. Volatility rule: country-specific address rules belong in a manager, not in the wizard.

## Goals / Non-Goals

**Goals:**

- One `profileAddressPolicy(countryCode)` manager: `showState`, `residenceLabel`, `residencePlaceholder`, state options when shown.
- Create-unit leader step (and any screen using `MemberProfileFields` + `churchCountryCode`) reads that manager.
- Persist `State` as its own optional column on `church_members`.

**Non-Goals:**

- Canada / UK / other subdivision pickers (the manager can grow later).
- Full street/city/ZIP validation or geocoding.
- Changing account self-profile or member detail labels in this slice unless they already use `MemberProfileFields`.
- Stuffing `"City, ST"` into `Residence`.

## Decisions

### 1. Manager, not screen `if (country === 'US')`

Same pattern as `createUnitPolicy` and `phoneCountryForCode`. The wizard stays layer- and country-agnostic. Tests lock US vs GH before UI wiring.

**Alternative:** `if (countryCode === 'US')` in `UnitCreateWizard` — cheaper this week, copies into Add member and account next week.

### 2. New `State` column, not packed residence

Residence stays the street / area line. State is `string?` (2-letter USPS code). Optional at the DB; required in the UI only when the manager shows state **and** the form is in required-leader mode.

**Alternative:** append `", MD"` to residence — no migration, but unreadable and breaks Ghana later.

### 3. Shared fields consume the manager

`MemberProfileFields` already takes `churchCountryCode`. It calls the manager. Create-unit and Add member inherit the same fields. Payload adds `state`.

### 4. US states list lives with the manager

Fifty states + DC as `{ code, label }`. No extra dependency.

## Risks / Trade-offs

- [Existing members have no state] → Column nullable; old rows stay null.
- [Canada churches also use +1] → Policy keys on `countryCode`, not dial code. CA stays on residence-only until a later change.
- [Leftover Api Domain / dead cell-create wizard] → Wire `MemberProfileFields` only; do not revive dead wizards.

## Migration Plan

1. Add `State` on Domain `Member`, fluent max length 8, EF migration on Infrastructure.
2. Add `State` to `StructureMemberDto`, `NewStructureNodeLeaderRequest`, create/update member requests, `ApplyMemberProfile`.
3. Frontend manager + fields + payload.
4. Rollback: drop the unused column; UI ignores missing `state`.

## Open Questions

None that block this slice. Province pickers for CA/NG can extend the manager later without changing the wizard.
