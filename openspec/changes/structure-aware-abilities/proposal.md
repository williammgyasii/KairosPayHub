## Why

Churches demoed KairosPayHub with different org charts than the fixed Pastor → PFCC → Fellowship → Cell role names imply. Today UI and many gates hardcode those role strings, so any new mid-layer or renamed leadership level becomes another special case. We need one authorization + structure model that scales for arbitrary church templates without rewriting permission checks per church.

## What Changes

- Introduce a stable **product ability** vocabulary (what someone can do), independent of role display names.
- **API is the source of truth**: `/api/me` (or equivalent session profile) returns the actor’s abilities, structure scope, and packed authorization rules for the client.
- **Structure-aware leadership**: leaders are assigned to structure nodes; capabilities come from **layer leadership profiles** (defaults by layer position/kind), not from checking `FellowshipLeader` in React.
- Churches configure **N ordered layers with their own labels** (existing template direction), including mid-layers that are not named Fellowship/PFCC.
- Frontend authorization uses **CASL** (`ability.can(...)`) fed by API-packed rules — no feature gates on role string equality.
- Migrate existing `ChurchRole` assignments to the new model without forcing churches to re-onboard.
- **BREAKING (client)**: screens that called `isScopedLeader` / role string checks for feature access must use abilities instead. Role may remain on `/me` for display/migration only.

## Capabilities

### New Capabilities

- `auth/abilities`: product abilities on the session profile; API enforcement stays authoritative; client consumes packed rules.
- `structure/layer-leadership`: node-scoped leadership + layer leadership profiles that map structure position → abilities; flexible church layer templates.

### Modified Capabilities

- (none archived yet — behavior lives in active changes / code; this change owns the new contracts)

## Impact

- API: `/api/me` (or auth profile) payload, ability resolution service, layer profile defaults, migration of `RoleAssignment` / scope resolution, enforcement helpers.
- Frontend: `@casl/ability` (+ React bindings), ability provider, replace role-based feature gates for giving/roster/attendance entry points over time (this change covers the framework + primary giving gates; remaining screens migrate on the same pattern).
- Structure onboarding / template UX: clarify that layer labels are church-specific; leadership types follow layer profiles.
- Tests: API ability resolution + migration; frontend ability helpers; integration for cell/mid-layer leaders seeing Member givings via ability, not role name.
