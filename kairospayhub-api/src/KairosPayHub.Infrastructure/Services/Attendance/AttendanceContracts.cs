namespace KairosPayHub.Api.Services;

public record AttendanceEntryUpdate(Guid MemberId, string Status);

public record AttendanceEntryDto(
    Guid Id,
    Guid MemberId,
    string MemberName,
    Guid MemberScopeNodeId,
    string Status);

public record AttendanceScopeSubmissionDto(
    Guid Id,
    Guid ScopeNodeId,
    string ScopeUnitName,
    string? ParentUnitName,
    string? ParentLayerName,
    string? LayerName,
    string LockStatus,
    string ApprovalStatus,
    DateTimeOffset? SubmittedAt,
    string? EnteredByRole,
    string? PendingApproverRole,
    int MembersPresent,
    int MembersAbsent,
    int GuestsPresent,
    int FirstTimersPresent,
    int TotalPresent);

public record AttendanceApproveResult(
    bool Ok,
    bool IsFinal,
    string ApprovalStatus,
    string? PendingApproverRole);

public record AttendanceApprovalQueueItemDto(
    Guid OccurrenceId,
    Guid ScopeNodeId,
    string CellName,
    string MeetingTypeTitle,
    DateOnly MeetingDate,
    DateTimeOffset? SubmittedAt,
    string? SubmittedByName,
    string? EnteredByRole,
    int PresentCount,
    int AbsentCount,
    int MemberCount);

public record AttendanceMySubmissionDto(
    Guid OccurrenceId,
    Guid ScopeNodeId,
    string ScopeUnitName,
    string MeetingTypeTitle,
    DateOnly MeetingDate,
    string ApprovalStatus,
    DateTimeOffset? SubmittedAt);

public record AttendanceOccurrenceDetailDto(
    Guid Id,
    Guid MeetingTypeId,
    string MeetingTypeTitle,
    DateOnly MeetingDate,
    string Status,
    DateTimeOffset SubmissionOpensAt,
    DateTimeOffset SubmissionDeadlineAt,
    IReadOnlyList<AttendanceScopeSubmissionDto> ScopeSubmissions,
    IReadOnlyList<AttendanceEntryDto> Entries,
    IReadOnlyList<AttendanceFirstTimerDto> FirstTimers,
    IReadOnlyList<AttendanceInviteeEntryDto> InviteeEntries);

public record AttendanceScopeRollCallReviewDto(
    Guid OccurrenceId,
    Guid ScopeNodeId,
    string MeetingTypeTitle,
    DateOnly MeetingDate,
    string ApprovalStatus,
    IReadOnlyList<AttendanceEntryDto> Entries,
    IReadOnlyList<AttendanceInviteeEntryDto> InviteeEntries);

public record AttendancePresentPersonDto(
    string Name,
    string PersonKind,
    Guid ScopeNodeId,
    string CellName,
    string? ParentUnitName,
    string? Phone,
    bool WasFirstTimer,
    string? InvitedByMemberName);

public record AttendanceRollupQuery(
    int Page = 1,
    int PageSize = 25,
    string SortBy = "name",
    string SortDir = "asc",
    string? Search = null,
    string? PersonKind = null,
    string? Cell = null);

public record AttendanceOccurrenceRollupDto(
    Guid OccurrenceId,
    string MeetingTypeTitle,
    DateOnly MeetingDate,
    int ApprovedCellCount,
    int PendingCellCount,
    int MembersPresent,
    int MembersAbsent,
    int GuestsPresent,
    int FirstTimersPresent,
    int TotalPresent,
    IReadOnlyList<AttendancePresentPersonDto> Items,
    int TotalCount,
    int Page,
    int PageSize);
