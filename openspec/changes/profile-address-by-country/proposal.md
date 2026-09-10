## Why

US churches need a State picker and a “Home address” label when adding a cell leader. Today every church sees one Ghana-shaped “Residence / location” field. Baking `country === 'US'` into the create-unit modal would break the next church locale the same way hardcoded Ghana phone did.

## What Changes

- Address fields on member-profile forms (create-unit leader step first) follow the church `countryCode`.
- US churches: State dropdown + label **Home address**. Other churches: no State field; keep the current residence label.
- Persist State as its own optional member column — do not stuff `"City, ST"` into residence.
- A **profile address manager** answers `showState` and labels. The form engine reads it; screens do not compare country strings.

## Capabilities

### New Capabilities

- `roster/profile-address`: Country-driven address fields (state visibility, home-address vs residence label) for member profile forms.

### Modified Capabilities

- `structure/unit-create`: Create-unit leader step uses the profile address policy from the church country (US cell leader gets State + Home address).

## Impact

- **Frontend**: new `profileAddressPolicy` manager; `MemberProfileFields` + unit-create leader step; payload includes `state`.
- **API**: optional `State` on member / new-leader contracts; EF column on `church_members`.
- **Tests**: manager tests for US vs GH; unit-create wizard test that US shows State and Home address, GH does not.
