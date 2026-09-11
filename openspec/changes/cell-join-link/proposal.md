## Why

Cell leaders typing people into Add member lets a roster fill with names nobody owns. Pastors asked for a link the member fills themselves so vitals are theirs, then the leader only accepts or declines.

## What Changes

- Deepest-layer leaders can mint one reusable join URL (and QR) for their unit. They pick 1, 7, or 30 days. Minting again or expiry invalidates the old token.
- Anyone with a live token opens `/join/{token}` (no login), submits the same vitals as Add member, and appears as **Pending** on that cell’s membership.
- The unit leader Accepts (active member, still no app login) or Declines (row removed). Pending people are not counted for attendance or giving.
- Mid-layer and church-wide actors keep Add member. Deepest-layer leaders use the invite link instead of typing a member in.

## Capabilities

### New Capabilities

- `roster/cell-join-link`: Generate/expire/rotate a deepest-unit join link and QR; public vitals form; pending accept/decline on Membership.

### Modified Capabilities

- (none)

## Impact

- API: join-invite store, public GET/POST join, mint + accept/decline endpoints, member pending status, list filters.
- Frontend: invite control + QR on deepest-unit membership; public `/join/:token` page; Pending badge and Accept/Decline.
- No Identity user for joiners. No fellowship-level links. No SMS.
