## 1. Helpers + tests

- [x] 1.1 Add unit tests for sticky tiers by width and denser default visibility (campaigns hidden); verify they fail against old helpers
- [x] 1.2 Implement `stickyTierForWidth` / tier-aware `stickyColumnLeft`/`Width` and update `defaultOverallGivingsColumnVisibility` + storage key v3; verify unit tests pass

## 2. Table wiring

- [x] 2.1 Wire `MemberGivingRankingsTable` to viewport sticky tier (resize-aware) and new defaults; verify rankings/overall unit tests pass
- [x] 2.2 Run frontend unit tests for overall-givings helpers; restart local API + frontend and spot-check Overall givings at ~400px and desktop
