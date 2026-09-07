## Context

Member history already returns flat Present/Absent rows with `meetingTypeTitle`. Canada Church has multiple meeting types but sparse recorded data; UI must still show all types (including zero counts).

## Decisions

1. **Filter**: `GET .../history?meetingTypeId=` filters items + page summary to that type. Omit → all types (items mixed; summary = overall).
2. **`meetingTypes` always**: Response always includes every active church meeting type with that member’s counts (zeros included), so the UI can render tabs without a second call.
3. **UI**: Tabs (or horizontal chips on narrow) for each meeting type; selecting one refetches with `meetingTypeId`. Default select first type that has `recordedCount > 0`, else first type.
4. **Items**: Add `meetingTypeId` on each history item for client clarity.

## Risks

- Sparse demo data → Playwright asserts tabs + filter contract even when counts are zero; optional live seed for richer manual QA.
