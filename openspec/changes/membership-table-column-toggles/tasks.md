## 1. Column visibility helper

- [x] 1.1 Add `membership-table-columns.ts` with profile column ids, labels, default visibility, and merge helper for structure layers
- [x] 1.2 Unit tests for defaults and structure-layer merge (Name always on; profile defaults as designed)

## 2. Table + toolbar

- [x] 2.1 Wire TanStack `columnVisibility` on `StructureMemberTable`; add columns for state, DOB, workplace; remove reliance on all-or-nothing `extendedColumns` for membership
- [x] 2.2 Add Columns dropdown (Attendance-style toggles) to membership toolbar or table chrome
- [x] 2.3 Wire visibility state in `MembershipView` (and unit roster member table if it uses extended columns)

## 3. Verify

- [x] 3.1 Run frontend unit tests for the new helper (and table/toolbar if present)
- [x] 3.2 Restart local API + frontend per project rules
