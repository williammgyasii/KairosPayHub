## 1. Pending status and invite store

- [x] 1.1 Add failing API tests: mint 7-day token on deepest unit; mid-layer mint 403; rotate invalidates old; public POST creates Pending; expired POST 400; accept → Active; decline deletes; pending omitted from giving/attendance counts. Verify they fail.
- [x] 1.2 Add `RosterStatus`, `unit_join_invites`, `UnitJoinInviteService`, public join + mint + accept/decline endpoints. Apply migration on **dev**. Verify the tests in 1.1 pass.

## 2. Public form and membership UI

- [x] 2.1 Add failing frontend tests: deepest-scope Membership shows Generate join link (not Add member); mid-layer still has Add member; pending row has Accept/Decline. Verify they fail.
- [x] 2.2 Public `/join/:token` vitals form (reuse profile fields). Membership: duration picker, copy link, QR; Pending badge; Accept/Decline. Verify the tests in 2.1 pass.
- [x] 2.3 Pending members tab next to Generate join link; New mark + sort; ancestor unit labels for scoped leaders; row color.

## 3. Verify

- [x] 3.1 Run new FE unit tests and API tests (Docker if available). Restart local API + frontend.
- [ ] 3.2 Smoke on **dev**: as cell leader, mint 1-day link, open it logged out, submit vitals, see Pending, Accept, confirm they appear as a member.
- [x] 3.3 Close join leaks: no email oracle, pending cap + rate limit, enforce manageRoster on write APIs. Public join form is a two-column grid with required email and phone.
