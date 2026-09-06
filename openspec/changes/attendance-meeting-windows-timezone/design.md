## Context

Meeting types already support weekly weekday + `opensDayOffset` / `deadlineDayOffset` + UTC `TimeOnly` fields. The UI hard-codes “GMT (Ghana)” and offers offsets 0–3. Country/currency exist on church; no timezone. Demo “Open now” checkbox forces a wide window for testing.

## Goals / Non-Goals

**Goals:**
- Always-open meeting types.
- Smarter weekly open/deadline UX (same day / next day selects + times) in church local time.
- Church timezone from country onboarding.
- Tooltips on key fields.

**Non-Goals:**
- Pastor role-assignment admin UI (later).
- One-off meeting redesign.
- Arbitrary open offsets beyond next day for weekly types in this change.

## Decisions

1. **Always open**  
   Add `IsAlwaysOpen` (or equivalent) on `AttendanceMeetingType`. When true, window calculator treats the occurrence as open for submission regardless of open/deadline (still generate occurrences for the meeting day). Finite open/deadline fields may remain in DB with ignored defaults when always open.

2. **Open options for weekly**  
   Only offsets `0` and `1`. Labels built from `dayOfWeek` (“Saturday (same day)”, “Sunday (next day)”). Drop UI options for +2/+3 on weekly forms.

3. **Defaults**  
   Open: offset `0`, time `21:00` church local. Deadline: offset `1`, time `12:00` church local. Pastor can change.

4. **Timezone storage**  
   `Church.TimeZoneId` (IANA string). Extend `ChurchLocale` with default timezone per country code. Onboarding sets it when country is chosen; show in onboarding summary. Meeting form converts local time ↔ stored UTC (or store as local wall time + TZ — prefer: keep storing UTC instants / UTC time-of-day as today but **interpret and edit in church TZ**; document conversion in calculator).

5. **Calculator**  
   Update `AttendanceWindowCalculator` to apply church timezone when combining meeting date + offset + time. Existing UTC storage remains valid if conversion is correct.

6. **Tooltips**  
   Reuse existing UI tooltip patterns; short copy only.

7. **Open now for demo**  
   Keep for local testing OR replace with Always open in UI copy — prefer keep demo checkbox in create form for now behind less prominent placement; Always open is the product path.

## Risks / Trade-offs

- [Existing meeting types with offset 2–3] → Clamp or migrate to 0/1 on edit validation; list still displays historical windows.  
- [Countries with multiple zones] → Start with one default per country code; allow override later in settings if needed (optional task).  
- [DST] → IANA zones handle DST; tests for Accra (no DST) and a DST country if mapped.

## Migration Plan

1. Add `TimeZoneId` + `IsAlwaysOpen` (migration).  
2. Backfill timezone from `CountryCode` via locale map; backfill missing country to a safe default.  
3. Ship form + calculator; validate open ≤ deadline in church local.

## Assumptions (approve or correct)

- “Sharp C N inputs” interpreted as **clear select + time inputs** (not free numeric offsets).  
- Weekly open limited to **same day / next day** only.  
- Default open **21:00** meeting day, deadline **12:00** next day (church local).  
- Role-assignment pastor UI **not** in this change.

## Open Questions

- None blocking if assumptions above are accepted.
