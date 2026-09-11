## Context

See proposal.md for why. `membershipRowTone` already returns `pending` | `new` | `default` from roster status and a 14-day `createdAt` window. The table paints New from that tone. `currentMemberId` already reaches the table from `/me` and is used only for “cannot remove yourself.”

## Goals / Non-Goals

**Goals:**

- One manager answers the name badge (and keeps sort ranks). The table does not compare `member.id === currentMemberId`.
- You wins over New. Pending still wins over You (a pending row stays Pending).
- Sort ranks stay pending → new → default. You uses the same rank it would have without the badge.

**Non-Goals:**

- Pinning the current member to the top.
- Pinning or restyling New / Pending. You uses its own sky bubble (`rounded-md`), not the emerald New chip.
- API or `/me` changes.

## Decisions

### 1. Manager owns “this row is me”

Extend `membershipRowTone` with optional `memberId` + `currentMemberId`. If both are present and equal, and the row is not pending, return `you`. The name cell paints `You` for that tone.

**Alternative:** `if (id === currentMemberId)` next to the New badge in the table — cheaper, then copies into Units drill-in later.

### 2. You is a tone, not a second badge

One chip per name. Pending > You > New > none. A linked member who is somehow still Pending keeps Pending (they need Accept), not You.

**Alternative:** show both Pending and You — noisier, and logged-in members are not pending.

### 3. Sort ignores You

`membershipRowSortRank('you')` uses the same rank as `new` or `default` based on recency (compute recency first, then overlay the You label). Easiest: compute base tone, then if current member and not pending, relabel to `you` without changing sort input. `sortMembershipRows` keeps calling the base recency/pending tone.

**Alternative:** sort You just under Pending — easier to find yourself, rejected in the approved design.

## Risks / Trade-offs

- [Viewer has no linked member] → No You badge. Same as today (`currentMemberId` null).
- [Units list also shows names] → Only Membership name cell in this slice; next screen should call the same manager, not copy the `if`.
