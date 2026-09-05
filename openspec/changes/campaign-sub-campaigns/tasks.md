## 1. Dual giving (backend + UI)

- [x] 1.1 Update integration tests for parent + sub-campaign dual logging and combined rollup
- [x] 1.2 Remove parent-has-children contribution guard; fix AcceptsContributions and totals/rollup
- [x] 1.3 Legacy flag only for contributions before first sub-campaign createdAt
- [x] 1.4 Remove parent "must use sub-giving" banner from program dashboard

## 2. Main campaign wizard

- [x] 2.1 Add StartsOn, EndsOn, GoLiveAt, GivingType.Other to API + migration
- [x] 2.2 Redesign create-program-wizard step order (name → type → timeline → go-live → scope → review)
- [x] 2.3 Delay leader notification until go-live

## 3. Recurring sub-campaigns

- [x] 3.1 Batch create API with frequency, range, logOpensOffsetDays + preview
- [x] 3.2 Replace create-sub-period-wizard with one-off vs recurring flow
- [x] 3.3 Sub-campaign list shows event date and log window status
