## Why

Overall givings is a thin rankings list that cannot answer “who gave where, under which structure unit, and when last?” Pastors need a deep, campaign-quality TanStack table: campaigns (main + sub), structure layers from the church template, column visibility, and roster-style filters—with last giving newest-first.

## What Changes

- Replace the overall-givings rankings table with an in-depth TanStack table (sort, expand, column visibility, pagination).
- Enrich member-totals API responses with approved campaigns (main and sub) per member: id, title, parent id, approved amount/count.
- Default sort: last given descending (newest first); rank by approved total remains available.
- Structure: one column per church template layer (hide layers the church does not use); optional hide/show and persist visibility.
- Campaigns column: count badge + truncated chips; row expand shows full campaign list with amounts.
- Filters: SQL-like rule builder (same pattern as roster/membership) for member name and structure layer fields; campaign scope filter retained.
- Column visibility only (not inline cell editing of amounts).

## Capabilities

### New Capabilities

- `giving/overall-member-totals`: overall givings member rankings table behavior, enriched totals DTO, structure columns, filters, expand/chips.

### Modified Capabilities

- (none — no archived main specs for this surface yet)

## Impact

- API: `GET .../member-totals` DTO + `ContributionService.ListMemberTotalsAsync`
- Frontend: `MemberGivingRankingsTable`, `OverallGivingsPage`, giving API types; reuse `member-table-toolbar` / `member-filters` and TanStack patterns from campaigns tables
- Tests: API integration for campaign enrichment; frontend unit tests for column helpers / expand chip display
