## 1. Shared rankings table scope

- [x] 1.1 Add `programId` / `scopeMode` props to `MemberGivingRankingsTable` (lock campaign picker when scoped); verify overall page still works with church scope
- [x] 1.2 Separate column-visibility storage keys for church vs campaign scope; verify campaign columns only include tree programs when `programId` set

## 2. Campaign detail IA

- [x] 2.1 Replace Approved / Awaiting tabs with Member givings + Transactions; map legacy `?tab=` values; verify manager tab list
- [x] 2.2 Mount scoped rankings table on Member givings; verify sub-campaign amount columns and sticky/filter parity
- [x] 2.3 Mount campaign Transactions with status filter (pending/approved/all) and approve/reject; verify pending badge and scoped rows

## 3. Sidebar / church-wide transactions

- [x] 3.1 Align Transactions page copy/segments as church-wide “all transactions”; ensure awaiting badge deep-links to pending; verify multi-campaign rows

## 4. Verify

- [x] 4.1 Restart dev servers and smoke: Overall givings, campaign Member givings, campaign Transactions, sidebar Transactions
