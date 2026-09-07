## Context

See proposal.md. Roster list is `GET /api/structure/members`; giving history exists; attendance entries exist per occurrence but no member history API. Detail UX is `MemberDetailSheet`.

## Goals / Non-Goals

**Goals:**
- Routes + pages for profile / attendance / givings / edit
- Sticky responsive Name on membership table
- Member attendance history API + contract tests
- Playwright smoke for navigation + sticky/overflow

**Non-Goals:**
- Rebuilding full attendance analytics product
- Changing roster filter/search semantics
- Mobile native apps

## Decisions

1. **Routes** under `/roster/members/:memberId`, `/attendance`, `/givings`, `/edit`  
2. **Member load**: resolve from list/tree cache or `GET` list with search by id; prefer loading member from structure tree members + list item; add thin `GET /api/structure/members/{id}` if needed for deep links.  
   *Decision:* Add `GET /api/structure/members/{memberId}` for deep-link reliability.  
3. **Attendance history**: `GET /api/attendance/members/{memberId}/history?page&pageSize` returning rows (occurrence date, meeting type name, status, scope unit) + summary (presentCount, absentCount, recordedCount, joinedAt from member created if available / first present).  
4. **Sticky name**: reuse overall-givings sticky tier helpers pattern — on narrow viewports name sticky only; on larger screens name sticky (always at least name). Member column always sticky; optionally pin nothing else.  
5. **Edit page**: full-page wrapper around existing `MemberEditWizard` (no modal).  
6. **Givings page**: reuse `listMemberContributions` + table UI from `MemberGivingTab`.  
7. **Profile page**: overview cards + links to attendance/givings/edit; structure chain.

## Risks / Trade-offs

- [Large attendance history] → Paginate history endpoint.  
- [Authz] → Same church-scope checks as structure member read.

## Migration Plan

Deploy API then FE. Additive endpoints. Rollback FE first if needed.
