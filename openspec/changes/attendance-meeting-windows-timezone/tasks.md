## 1. Church timezone

- [x] 1.1 Add `TimeZoneId` on church + migration; extend `ChurchLocale` with default IANA zone per country
- [x] 1.2 Onboarding / church create: set timezone from country; surface on `/api/me` or church profile as needed
- [x] 1.3 Tests: Ghana → `Africa/Accra` (or mapped default); windows use church TZ

## 2. Always open + window model

- [x] 2.1 Add `IsAlwaysOpen` on meeting type + API DTOs; calculator/generator honor always-open (no open/deadline gate)
- [x] 2.2 Integration tests: always-open allows submit outside former window

## 3. Meeting type form UX

- [x] 3.1 Always open toggle + “?” tooltips for Always open, Submission opens, Deadline
- [x] 3.2 Restrict open/deadline day selects to same day / next day with weekday-smart labels; time inputs in church TZ
- [x] 3.3 Defaults: open same-day 21:00 local, deadline next-day 12:00 local; validate open before deadline
- [x] 3.4 Hide/disable open+deadline controls when Always open is on

## 4. Verify

- [x] 4.1 Pastor create Saturday meeting with always-open and with finite window; cell leader roll call smoke
- [x] 4.2 Restart servers; confirm timezone label on form matches church
