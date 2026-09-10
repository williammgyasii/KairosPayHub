## Context

See proposal.md. `/account` is a read-only dump of JWT name/email/role plus placeholder Security and Notifications sections. `GET /api/me` does not read `church_members`. `PATCH /api/structure/members/{id}` is for pastors/scoped leaders managing someone in scope — not self-serve. `MemberProfileFields` already collects phone, DOB, residence, and work.

`CurrentActor.Name` comes from the JWT `name` claim, so GET must prefer the member row (or `ApplicationUser.DisplayName`) after a save or the top bar stays stale until re-login.

## Goals / Non-Goals

**Goals:**

- One write path for “this is me”: `PATCH /api/me` → linked `church_members`.
- One read path: GET `/api/me` + existing member/tree reads, all the same row.
- Account UI split; Profile reuses `MemberProfileFields`.
- Policy is “has linked member row,” not `role === 'CellLeader'`.

**Non-Goals:**

- Creating a member row for pastors/admins who are not on the roster.
- Self-serve unit move, position, or responsiveness.
- Real notification preferences (placeholder only).
- Changing login email.
- Restyling the roster member-edit wizard (it already writes the same table).

## Decisions

1. **New `PATCH /api/me`, do not reuse member PATCH**  
   Member PATCH requires `RequireMemberManageAsync`. A future Member login would be forbidden from editing themselves. Me PATCH is “update the row where `AuthUserId` is me.”  
   *Alt:* Call member PATCH from Account — couples self-edit to leader manage rules.

2. **GET `/api/me` loads the linked member**  
   Find `church_members` by `ChurchId` + `AuthUserId`. Expose `memberId`, `name` (member name if present), and profile fields. Also set `ApplicationUser.DisplayName` on name PATCH so Auth/login views stay aligned.  
   *Alt:* Keep JWT name only — header would lie after save.

3. **Volatility split**  
   **Manager:** `canEditSelfProfile = Boolean(me.memberId)` (or non-null profile from GET). **Engine:** Account Profile page + `MemberProfileFields` + `PATCH /api/me`. Do not branch on Cell/Fellowship.  
   *Alt:* Hide the form unless `role === 'CellLeader'` — breaks the next login type.

4. **Account routes, not Settings routes**  
   `/account` (profile), `/account/security`, `/account/notifications`. Settings stays church-wide (branding, administrators). All roles see Account sub-nav; pastors still reach Account from Settings tabs.  
   *Alt:* One scrolling page with hashes — the current mess.

5. **Email field is displayed, never posted**  
   Ignore email on PATCH even if a client sends it (same idea as member update when `AuthUserId` is set).

## Risks / Trade-offs

- [Two names] JWT claim vs member name → GET prefers member / DisplayName; invalidate `Me` after PATCH.
- [No member row] PATCH 400; Profile stays read-only. Do not auto-create a row.
- [Cache] Structure tree and member detail can show old DOB until tags invalidate (`Me` + structure).

## Migration Plan

No schema change. Deploy API (GET shape is additive; PATCH is new) then SPA. Rollback is revert; old clients ignore extra GET fields.

## Open Questions

None that block apply. Display name is editable (included in the approved Account map).
