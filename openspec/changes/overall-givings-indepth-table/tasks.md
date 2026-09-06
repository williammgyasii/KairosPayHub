## 1. API — campaign enrichment

- [x] 1.1 Add failing integration test: member totals includes approved main+sub campaigns and excludes pending-only campaigns (spec: Member totals include campaigns given to)
- [x] 1.2 Extend `MemberGivingTotalDto` with campaigns list DTO and implement batch enrichment in `ListMemberTotalsAsync`; verify test passes

## 2. Frontend types and helpers

- [x] 2.1 Update `MemberGivingTotal` / list mapping for `campaigns`; add unit tests for chip truncation + structure column catalog from template layers
- [x] 2.2 Add helpers to map member totals + tree → filterable rows; verify filter unit tests (name + layer) pass

## 3. TanStack overall givings table

- [x] 3.1 Rebuild `MemberGivingRankingsTable` with TanStack: default sort lastDateSent desc, core columns, soft loading; verify default sort behavior in unit/UI check
- [x] 3.2 Campaigns column: count + chips; expandable row with amount/count per campaign; verify expand shows full list
- [x] 3.3 Structure layer columns + column visibility menu with localStorage persistence; verify hide/show and no PFCC when template lacks it
- [x] 3.4 Wire `MemberTableToolbar` (name + structure filters) and campaign scope; when filters active fetch larger set (cap ~500); verify fellowship/name filter scenarios

## 4. Page polish and verify

- [x] 4.1 Keep breakdown modal via row action; restart dev servers and smoke Overall givings end-to-end
