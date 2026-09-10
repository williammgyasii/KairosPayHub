## Why

Dual giving (main + sub) is always on today, but churches often want a main campaign as a **container** with logging only on sub-campaigns — or both. Pastors need that choice at create time and later in campaign settings, with clear copy and consistent data when turning the option off.

## What Changes

- Persist a root-campaign setting: whether the main campaign receives direct givings.
- Create-campaign UI: **“Receive givings on main campaign?”** with help text; ON → optional first sub; OFF → **must** create at least one sub before finish.
- Campaign settings on the root: same toggle; turning OFF with existing direct contributions requires picking or creating a sub and **moving** those contributions first.
- API rejects new contributions on the root when the setting is off; UI hides Log on the main in that case.
- Existing roots migrate to **on** (current dual-giving behavior).
- **BREAKING** (behavior): logging on a main with children is no longer always allowed — only when the setting is on.

## Capabilities

### New Capabilities

- `giving/campaign-settings`: Root campaign settings surface and `receiveGivingsOnMain` persistence, create-time branching, and turn-off migrate flow.
- `giving/contributions`: Parent contribution logging is gated by `receiveGivingsOnMain` (replaces always-on dual giving from `campaign-sub-campaigns`).

### Modified Capabilities

- (none — `giving/contributions` is not yet archived under `openspec/specs/`; this change introduces the gated requirement.)

## Impact

- Domain/API: column on `GivingProgram`, create/update settings endpoint, contribution create guard, move-contributions reuse.
- Frontend: create-program wizard, campaign settings UI, log button / `acceptsContributions` consumers.
- Specs: supersedes the unconditional “parent accepts alongside subs” rule from `campaign-sub-campaigns`.
