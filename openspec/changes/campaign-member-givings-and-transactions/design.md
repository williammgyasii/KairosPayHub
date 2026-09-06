## Context

Overall givings already ships an in-depth `MemberGivingRankingsTable` backed by `GET member-totals` (supports `programId` tree scope + campaign enrichment). Campaign detail still uses `ContributionsApprovalTable` under Approved / Awaiting tabs. Sidebar already has Transactions (church-wide) and Overall givings. See proposal.md for IA goals.

## Goals / Non-Goals

**Goals:**
- Shared rankings table for overall vs campaign (`programId` optional; lock UI when set).
- Campaign tabs: Member givings + Transactions (replace Approved / Awaiting).
- Sidebar Transactions = all; campaign Transactions = scoped ledger with status filter.
- Preserve approve/reject actions on pending rows.

**Non-Goals:**
- New member-totals API (reuse existing).
- Removing Overall givings from the sidebar.
- Changing campaign create/list flows.

## Decisions

1. **Reuse `MemberGivingRankingsTable` with `programId` + `scopeMode: 'church' | 'campaign'`**  
   When `campaign`, hide All-campaigns select; force `programId`; column storage key `overall-givings-columns-campaign-v2` vs church key; campaign columns already derive from loaded rows (tree-scoped fetch).

2. **Campaign tab set (managers)**  
   Keep Dashboard / Sub-givings as today; replace Approved + Awaiting with `member-givings` + `transactions`. History/structure tabs: keep if still useful, or fold later—default keep Contributions/History if present for non-manager roles; for church managers prefer Member givings over old Approved.

3. **Campaign Transactions UI**  
   Reuse `ContributionsApprovalTable` (or ledger) with `scope=program` and a status segment (pending | approved | all) instead of separate tab mounts. Badge on Transactions tab = awaiting count.

4. **Sidebar badge**  
   Continue aggregating `awaitingMyApprovalCount` on Givings → Transactions (pending filter deep-link `?status=pending` if not already).

5. **Redirects**  
   Old `?tab=approved` / `?tab=awaiting|pending` → `member-givings` / `transactions?status=pending`.

## Risks / Trade-offs

- [Dual mental model: rankings vs line-item transactions] → Clear tab labels: “Member givings” vs “Transactions”.  
- [Large campaign trees / many sub columns] → Same column visibility as overall.  
- [Role-specific tabs] → Leaders who only saw awaiting keep Transactions with pending default.

## Migration Plan

- Frontend-only IA; no DB migration.  
- Deep links: map legacy tab query params.

## Open Questions

- None blocking; Contributions/History tabs for managers can be trimmed in a follow-up if redundant with Member givings.
