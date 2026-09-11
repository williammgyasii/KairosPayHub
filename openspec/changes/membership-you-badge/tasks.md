## 1. Manager

- [x] 1.1 Add failing `membershipRowTone` tests: you+recent → you (not new); you+old → you; other+recent → new; pending current member → pending. Verify they fail.
- [x] 1.2 Add failing sort test: pending, then other New, then older You, not pinned. Verify it fails only if sort changes; keep passing if sort already ignores You.
- [x] 1.3 Extend `membershipRowTone` with `memberId` / `currentMemberId` so You wins over New and Pending wins over You. Verify the tests in 1.1 pass.

## 2. Table

- [x] 2.1 Name cell paints You from tone `you` using the same green chip as New, and never shows New on that row. Verify a membership table test (or existing row test) expects You when `currentMemberId` matches.
- [ ] 2.2 Restart frontend per workspace rule and smoke Membership as a linked leader: own row says You, another recent member still says New.
