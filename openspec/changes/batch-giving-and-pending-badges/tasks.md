## 1. Backend batch create + notify

- [x] 1.1 Add batch request/response contracts and `CreateBatchAsync` (transactional, shared batchId, one `NotifyContributionBatchPendingAsync`)
- [x] 1.2 Add `POST programs/{id}/contributions/batch` endpoint
- [x] 1.3 Integration tests: batch creates N rows + exactly one pending notification; single create still one notification
- [x] 1.4 Add `awaitingMyApprovalCount` to program list DTO + computation; test approver count

## 2. Frontend batch + activity

- [x] 2.1 API client + wizard uses batch endpoint for bulk mode
- [x] 2.2 Group recent activity by batchId (one row); unit tests for grouping helper
- [x] 2.3 Fix ProgramDetailPage to keep view mounted during contribution refetch

## 3. Campaign pending badges

- [x] 3.1 Map `awaitingMyApprovalCount` on frontend `GivingProgram`
- [x] 3.2 Clickable awaiting badge on campaigns table → `?tab=awaiting`
- [x] 3.3 Givings sidebar badge from sum of awaiting counts (approver roles)
- [x] 3.4 Restart and verify API + frontend
