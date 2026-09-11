## Context

Add member writes a `church_members` row from a signed-in leader (`StructureMemberService`). Leader invite is a different flow (Identity + set-password). See proposal.md for why. Deepest layer comes from the template (`getDeepestLayer`), not `standardType === 'Cell'`.

## Goals / Non-Goals

**Goals**

- One active `unit_join_invites` row per node (token, expiry, created-by).
- Public join GET/POST; pending `RosterStatus` on `Member`.
- Mint only when the actor’s `scopeNodeId` is on the deepest layer (or they are minting that deepest node they lead).
- Hide Add member for deepest-scoped leaders; show invite link + QR instead.

**Non-Goals**

- Identity/login for joiners.
- Fellowship-level or church-wide join links.
- SMS / WhatsApp send from the server.

## Decisions

1. **Status on `Member`, not a second table** — `RosterStatus` = `Active` | `Pending`. Same list API; FE badges. Attendance/giving queries filter `Active` only. Alternative (pending table) doubles promote logic.

2. **Invite row keyed by node** — unique live token per `NodeId`. Rotate = delete/replace. Token is a high-entropy URL-safe string (not the node id).

3. **Allow-anonymous join controller** — `GET/POST /api/join/{token}`. GET returns church name, unit name, country, expiresAt for the form chrome. POST reuses create-member validation (birthday required, email optional).

4. **Mint `POST /api/structure/nodes/{id}/join-invite`** with `{ expiresInDays: 1 | 7 | 30 }`. GET current invite (token URL + expiresAt) or 404. Auth: `manageRoster` + node is deepest layer + node is in actor subtree (leaf: their unit only).

5. **Accept/decline** — `POST /api/structure/members/{id}/accept-join` and `…/decline-join`. Same roster scope as delete. Decline deletes the pending row.

6. **QR is the same URL** — client-side QR from the mint response. No second token.

## Risks / Trade-offs

- [Public form spam] → expiry + rotate; no account to abuse later.
- [Leaked QR photo] → leader mints again; old token dies.
- [Pending in tree.members] → tree/list exclude or flag pending so counts stay honest.

## Migration Plan

- EF migration on **dev**: `RosterStatus` on `church_members` (default Active), `unit_join_invites` table.
- Existing members stay Active. No backfill of invites.
