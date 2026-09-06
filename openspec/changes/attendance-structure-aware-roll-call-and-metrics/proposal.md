## Why

Attendance roll call and approvals assume a fixed Cell → Fellowship chain, but churches define their own structure templates (and meeting types vary). Pastors need to choose which structure layer submissions start from per meeting type, dual-hatted leaders need clear scopes, attendance approval must not bottleneck at the pastor, and metrics need a meeting-type → date → table flow with structure-aware labels. The meeting-type form also still exposes a redundant “Open now (demo)” control now that Always open exists.

## What Changes

- Add **Submissions start at** on meeting types: pastor picks a layer from the church’s structure template (Cell, Fellowship, Youth, etc.).
- Generate roll-call sheets for nodes on that layer (within meeting scope); leaders of those nodes submit; **one-hop parent** approves (not the pastor by default). Attendance stays less sensitive than giving.
- Dual-hatted leaders who lead units on multiple layers can choose which unit they are logging for.
- Redesign **metrics**: list meeting types → open a type → pick occurrence/date → view metrics and/or log; dense filterable table (campaign-style); tiles for present, members, first-timers, guests, pending approval, approved child units (structure-aware labels, not hard-coded “cells”).
- Meeting type form: align open/deadline controls; **remove Open now (demo)**; keep timezone labeling and Always open.

## Capabilities

### New Capabilities
- `attendance/submission-layer`: Meeting types declare which structure layer starts roll-call submission; sheets, submitters, and one-hop approvers follow that layer.
- `attendance/metrics-navigation`: Metrics IA by meeting type → occurrence → rollup table and actions.

### Modified Capabilities
- `attendance/meeting-windows`: Remove demo “Open now” from create UX; form layout/clarity for window fields (Always open and timezone behavior unchanged in spirit).

## Impact

- API: `AttendanceMeetingType` (+ DTOs), occurrence roll-call sync, `AttendanceScopeService` approval rules, overview/rollup DTOs and labels.
- Frontend: meeting-type form, roll-call scope picker, metrics routes/pages, approvals copy, nav.
- Depends on church structure template layers and leadership assignments; aligns with structure-aware abilities (node + layer), not hard-coded `CellLeader` forever.
- Migration for submission-layer foreign key / layer id on meeting types; backfill existing types to Cell layer when present, else deepest template layer.
