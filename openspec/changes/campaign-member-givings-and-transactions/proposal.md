## Why

Overall givings already shows an in-depth member rankings table across all campaigns, but a single campaign still uses separate Approved / Awaiting tabs that feel like a different product. Pastors need the same deep rankings experience scoped to one campaign, plus a single Transactions surface for payment status—church-wide in the sidebar and campaign-scoped inside each giving.

## What Changes

- **BREAKING (campaign IA):** Replace campaign **Approved** and **Awaiting/Pending** tabs with:
  - **Member givings** — same rankings table as Overall givings, scoped to this campaign (and its sub-campaigns as amount columns).
  - **Transactions** — pending + approved payment rows for this campaign tree, with status filters (not separate tabs).
- Sidebar **Transactions** remains church-wide (all transactions across campaigns); awaiting badge continues to point here (or into filtered pending).
- Sidebar keeps **Campaigns** and **Overall givings** unchanged in role.
- Reuse the overall rankings table component with a locked `programId` scope; hide global “All campaigns” picker when scoped.
- Church-wide Transactions page: treat Pending / Approved / All as filters on one ledger (already close; align copy and UX with campaign Transactions).

## Capabilities

### New Capabilities

- `giving/campaign-member-givings`: campaign-scoped member rankings table (parity with overall givings UX).
- `giving/transactions-surfaces`: sidebar (all) vs campaign (scoped) transactions; merged pending/approved via status filter.

### Modified Capabilities

- (none archived under `openspec/specs/` yet; deltas live as new capabilities above)

## Impact

- Frontend: `program-detail-view` tabs, `MemberGivingRankingsTable` scope props, `TransactionsPage` / campaign transactions panel, sidebar labels/badges
- API: existing `member-totals?programId=` and contribution list endpoints (likely no new endpoints)
- OpenSpec: builds on `overall-givings-indepth-table` table behavior
