## Why

Awaiting-approval UI hardcodes a PFCC column even when a church template has no PFCC (e.g. Canada). The table also needs a denser TanStack layout with kebab actions, separate totals, recent-activity approve actions, and near-realtime refresh when approvals happen.

## What Changes

- Structure-aware unit column/labels derived from the church template (omit PFCC when absent).
- Awaiting/approved tables: TanStack row model, ⋮ menu (View / Approve / Reject), newest first, totals in a separate summary table.
- Recent activity: smaller type, inline status badge, approve/reject for rows awaiting the viewer.
- On contribution notification kinds via SignalR, invalidate giving caches so status updates without a full page reload.

## Capabilities

### Modified Capabilities

- `giving/contributions`: structure-aware approval surfaces + realtime refresh behavior for contribution status.
