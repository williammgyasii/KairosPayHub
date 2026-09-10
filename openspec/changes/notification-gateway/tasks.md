## 1. Specs and regression tests

- [x] 1.1 Confirm gateway spec scenarios under `specs/notifications/gateway/spec.md`
- [x] 1.2 Add failing API test: Church → Cell cell log creates pastor `ContributionPendingApproval` notification
- [x] 1.3 Add/adjust test: Fellowship → Cell still notifies fellowship leader (pending role FellowshipLeader)

## 2. Shared approval recipients

- [x] 2.1 Wire contribution notify recipients through `ResolveContributionApprovingRoleAsync` (delete duplicate switch)
- [x] 2.2 Align attendance pending recipients with next-hop / skip-missing-layers
- [x] 2.3 Make contribution Church → Cell notify test pass

## 3. Engine + inbox split

- [x] 3.1 Add `NotificationEngine` (persist + SignalR push)
- [x] 3.2 Add `NotificationInboxService` (list / unread / mark-read); update controller
- [x] 3.3 Point composers at engine; register DI; delete dead private delivery helpers from composer

## 4. Composers + cleanup

- [x] 4.1 Keep all existing `Notify*` methods working (giving, attendance, calendar)
- [x] 4.2 Run notification + contribution structure-scope integration tests; fix regressions
- [x] 4.3 Mark tasks complete; restart dev servers
