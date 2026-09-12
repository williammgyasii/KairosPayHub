## Why

Roll call tells a pastor who was there. It does not tell them what happened. Churches treat a photo and a short written report as evidence; some meeting types need that story and others do not, and Sunday and Cell in the same church will not want the same prompts.

## What Changes

- Church managers can mark a meeting type as **requiring a report** and edit that type’s prompt schema (long text and photos only). Turning the toggle on seeds a default schema (taught, shared, optional prayer, required photos). Existing meeting types stay off.
- When a type requires a report, Mark attendance adds a **report step** after the sheet. Submit is blocked until every required prompt is filled (including at least one photo). Save draft still works without a complete report.
- Approvals (and the existing submission detail) show the filled answers and photos next to the roll.
- Answers are stored as a payload keyed by the schema, not hardcoded “What was taught” columns, so a later field-builder can extend kinds without a rewrite.

## Capabilities

### New Capabilities

- `attendance/meeting-reports`: Per-meeting-type report schema, required report step on submit, photos as evidence, approval read-back.

### Modified Capabilities

- (none)

## Impact

- API: meeting-type create/update gains report policy + schema; scope submission stores a report payload; photo upload via existing object storage; submit rejects an incomplete required report.
- Frontend: meeting-type form (toggle + schema editor); Mark attendance wizard step `report`; approval detail shows the report.
- No change to who can mark, windows, or guest-risk. No church-wide template, dropdowns, or yes/no fields in v1.
