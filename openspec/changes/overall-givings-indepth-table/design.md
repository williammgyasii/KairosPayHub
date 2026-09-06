## Context

Overall givings uses `GET member-totals` and a hand-rolled `MemberGivingRankingsTable` (search + root campaign select + sort). DTO has rank, member, totals, last date, parent node—no campaigns list. Campaigns tables already use TanStack; roster uses `MemberTableToolbar` + `applyMemberFilterRules`. Structure unit labels follow `churchHasLayerType` / template layers from prior awaiting-table work. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Enrich member-totals with per-member approved campaign aggregates (main + sub).
- Rebuild overall table on TanStack: expand, column visibility (localStorage), default `lastDateSent` desc.
- Structure columns from template layers; client-side filter rules on loaded page data (and/or full summary set when feasible).
- Campaigns cell: count + chips; expand panel for full list + amounts; keep existing breakdown modal via row action.

**Non-Goals:**
- Inline editing of amounts or member fields.
- Server-side SQL filter DSL for every roster field on member-totals (v1: client filter on returned/enriched rows; keep server search + programId).
- Replacing the per-member contribution breakdown modal.

## Decisions

1. **Campaign enrichment on API (batch after page query)**  
   After paging member rows, query approved contributions for those member ids (same scope) grouped by `(MemberId, ProgramId)` with program title/parent. Attach as `Campaigns: MemberGivingCampaignDto[]`.  
   *Alt:* Client fetch all contributions — too heavy. *Alt:* SQL JSON aggregate in main query — harder to maintain in EF; batch is clear and testable.

2. **Filters: client-side on current result set + structure tree**  
   Map each member row to a lightweight `StructureMemberRow`-compatible shape (name + layer unit names from `parentChain`) and reuse `applyMemberFilterRules` / `MemberTableToolbar` with `structureOnly` or a givings field subset (name + layers).  
   *Alt:* Push filters to API — better for large churches later; defer to keep v1 shippable. Document that filters apply to the loaded page unless we load a larger client cache for filter-then-page (prefer: when filters active, fetch larger pageSize or all matching search for filter pass—cap reasonably, e.g. 500).

3. **TanStack column visibility**  
   Persist key `overall-givings-columns-v1` in localStorage. Dynamic structure columns keyed by `layer:{standardType}` or layer id. Default visible: rank, member, approvedTotal, campaigns, lastDateSent, and top structure layers; pending optional hidden by default.

4. **Expand vs modal**  
   Expand = campaign chips detail (amount per campaign). ⋮ / View still opens `MemberGivingBreakdownModal` for full contribution history.

5. **Default sort**  
   Change default from `approvedTotal` desc to `lastDateSent` desc; rank column still reflects approved-total ranking from API.

## Risks / Trade-offs

- [Large churches / many campaigns per member] → Cap chips shown (e.g. 3) + “+N”; expand lists all.  
- [Client-only filters on one page] → Misleading empty results; mitigate by increasing fetch when filters on or documenting “filter within loaded results” and offering search + campaign scope first. Prefer fetch up to 500 members when any structure filter is active (same search/program scope).  
- [N+1 enrichment] → Single grouped query for page member ids only.

## Migration Plan

- Additive DTO fields; old clients ignore `campaigns`.  
- Deploy API then frontend. No DB migration.

## Open Questions

- None blocking; server-side filter DSL can be a follow-up if pastors hit page-size limits.
