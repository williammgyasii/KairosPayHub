## Why

Leaders scanning Membership cannot tell which row is their own. Recent joiners already get a New badge; the signed-in member should be labeled **You** so they can find themselves without hunting by name.

## What Changes

- The signed-in member’s row always shows a **You** badge on the name, even if they joined years ago.
- That row never also shows **New**. Other recent members still show New.
- Sort stays as it is today (Pending, then New, then the rest). You does not pin the row to the top.
- The membership-row manager decides the badge. The table only paints it.

## Capabilities

### New Capabilities

- `roster/membership-row`: Name-column badges on Membership (Pending, New, You) from roster status, recency, and “this row is me.”

### Modified Capabilities

- (none)

## Impact

- **Frontend**: `membership-row-presentation` manager + Membership name cell. `currentMemberId` already flows from `/me`.
- **API**: none.
- **Tests**: manager cases for you+new, you+old, someone else+new; table still sorts Pending then New.
