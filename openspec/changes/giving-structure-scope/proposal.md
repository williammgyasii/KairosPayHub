## Why

Givings still assume a PFCC → Fellowship church. Create campaign, add sub-campaign, who may create, who may bulk-log, and the approval hop all branch on `PFCC` / `Fellowship` / named roles. A Church → Cell or Fellowship → Cell tenant sees chips and rights that are not on their template.

## What Changes

- Campaign and sub-campaign **scope** come from the church structure template: church-wide (when allowed) or any unit on any template layer, including the deepest (cell) layer.
- Multi-select means several units on the **same** layer. A child campaign must stay inside the parent’s subtree.
- Persist **nodes** (church-wide, one node, or many nodes). Do not require the client to send `PFCC` / `Fellowship` as the source of truth.
- A **giving scope manager** answers options, labels, and who may create / bulk-log / approve from the tree + parent + actor leadership profile. Screens MUST NOT compare `standardType === 'PFCC'` or `role === 'FellowshipLeader'`.
- Create campaign and add sub-campaign become **one form** each (mode/dates/scope + short summary). No four-step sub-campaign stepper.
- Existing stored `ChurchWide` / `PFCC` / `Fellowship` / `FellowshipGroup` programs keep working.

## Capabilities

### New Capabilities

- `giving/structure-scope`: Template-driven campaign scope, persistence of scope nodes, leadership-based create/log/approve rights, and single-form create/sub-campaign engines.

### Modified Capabilities

- (none — `openspec/specs/` has no archived giving capability yet)

## Impact

- **Frontend**: `givingScopePolicy` manager; `create-program-wizard.tsx`, `create-sub-period-wizard.tsx`; log-bulk and remittance copy; stop hiding PFCC in the member picker.
- **API**: create/validate program and sub-campaign accept node-based scope; `GivingScopeService` / `GivingProgramService` stop requiring PFCC/Fellowship kinds and PFCC-only create; approval hop follows leadership + template (skip a layer that does not exist).
- **Tests**: manager tests for at least two templates (PFCC → Fellowship → Cell, and Fellowship → Cell or Church → Cell); API tests that a no-PFCC church can scope to a real unit and create a sub-campaign.
