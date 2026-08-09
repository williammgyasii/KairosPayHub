using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Api.Domain.Attendance;

public enum AttendanceRecurrenceKind
{
    Weekly,
    OneOff,
}

public enum AttendanceOccurrenceStatus
{
    Scheduled,
    Open,
    Closed,
    Excused,
}

public enum AttendanceScopeLockStatus
{
    NotYetOpen,
    Editable,
    Reopened,
    LockedSubmitted,
    LockedMissed,
    LockedGraceMissed,
}

public enum AttendanceScopeApprovalStatus
{
    Draft,
    PendingApproval,
    Approved,
    Rejected,
}

public enum AttendanceEntryStatus
{
    Present,
    Absent,
    Unrecorded,
}

public class AttendanceMeetingType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Domain.Structure.Church? Church { get; set; }
    public string Title { get; set; } = string.Empty;
    public AttendanceRecurrenceKind RecurrenceKind { get; set; } = AttendanceRecurrenceKind.Weekly;
    public DayOfWeek DayOfWeek { get; set; } = DayOfWeek.Sunday;
    public ProgramScopeKind ScopeKind { get; set; } = ProgramScopeKind.ChurchWide;
    public Guid? ScopeNodeId { get; set; }
    public int OpensDayOffset { get; set; }
    public TimeOnly OpensTimeUtc { get; set; }
    public int DeadlineDayOffset { get; set; } = 1;
    public TimeOnly DeadlineTimeUtc { get; set; }
    public int AutoGenerateWeeksAhead { get; set; } = 8;
    public bool IsActive { get; set; } = true;
    public Guid CreatedByAuthUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<AttendanceMeetingTypeScopeNode> ScopeNodes { get; set; } =
        new List<AttendanceMeetingTypeScopeNode>();
    public ICollection<AttendanceOccurrence> Occurrences { get; set; } = new List<AttendanceOccurrence>();
}

public class AttendanceMeetingTypeScopeNode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MeetingTypeId { get; set; }
    public AttendanceMeetingType? MeetingType { get; set; }
    public Guid StructureNodeId { get; set; }
}

public class AttendanceOccurrence
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Guid MeetingTypeId { get; set; }
    public AttendanceMeetingType? MeetingType { get; set; }
    public DateOnly MeetingDate { get; set; }
    public DateTimeOffset SubmissionOpensAt { get; set; }
    public DateTimeOffset SubmissionDeadlineAt { get; set; }
    public AttendanceOccurrenceStatus Status { get; set; } = AttendanceOccurrenceStatus.Scheduled;
    public string? ExcusedReason { get; set; }
    public Guid? ExcusedByAuthUserId { get; set; }
    public DateTimeOffset? ExcusedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<AttendanceScopeSubmission> ScopeSubmissions { get; set; } =
        new List<AttendanceScopeSubmission>();
    public ICollection<AttendanceEntry> Entries { get; set; } = new List<AttendanceEntry>();
}

public class AttendanceScopeSubmission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OccurrenceId { get; set; }
    public AttendanceOccurrence? Occurrence { get; set; }
    public Guid ScopeNodeId { get; set; }
    public Guid? AssignedLeaderAuthUserId { get; set; }
    public ChurchRole? EnteredByRole { get; set; }
    public AttendanceScopeApprovalStatus ApprovalStatus { get; set; } = AttendanceScopeApprovalStatus.Draft;
    public AttendanceScopeLockStatus LockStatus { get; set; } = AttendanceScopeLockStatus.NotYetOpen;
    public DateTimeOffset? SubmittedAt { get; set; }
    public Guid? SubmittedByAuthUserId { get; set; }
    public Guid? ApprovedByAuthUserId { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public Guid? RejectedByAuthUserId { get; set; }
    public DateTimeOffset? RejectedAt { get; set; }
    public string? RejectionReason { get; set; }
    public DateTimeOffset? GraceDeadlineAt { get; set; }
    public Guid? ReopenedByAuthUserId { get; set; }
    public DateTimeOffset? ReopenedAt { get; set; }
    public DateTimeOffset? LockedAt { get; set; }
}

public class AttendanceEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OccurrenceId { get; set; }
    public AttendanceOccurrence? Occurrence { get; set; }
    public Guid MemberId { get; set; }
    public Member? Member { get; set; }
    public AttendanceEntryStatus Status { get; set; } = AttendanceEntryStatus.Unrecorded;
    public Guid MemberScopeNodeId { get; set; }
    public Guid? MarkedByAuthUserId { get; set; }
    public DateTimeOffset? MarkedAt { get; set; }
    public DateTimeOffset? AutoMarkedAbsentAt { get; set; }
}

public class AttendanceFirstTimer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OccurrenceId { get; set; }
    public AttendanceOccurrence? Occurrence { get; set; }
    public Guid ScopeNodeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public enum InviteePriorChurchAttendance
{
    Never = 0,
    Once = 1,
    MoreThanOnce = 2,
}

public class AttendanceCellInvitee
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Guid CellScopeNodeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public string? Residence { get; set; }
    public MemberOccupationStatus? OccupationStatus { get; set; }
    public string? SchoolOrWorkplace { get; set; }
    public bool IsFirstTimer { get; set; }
    public InviteePriorChurchAttendance? PriorChurchAttendance { get; set; }
    public Guid? InvitedByMemberId { get; set; }
    public Member? InvitedByMember { get; set; }
    public Guid? GraduatedMemberId { get; set; }
    public Member? GraduatedMember { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
}

public class AttendanceInviteeEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OccurrenceId { get; set; }
    public AttendanceOccurrence? Occurrence { get; set; }
    public Guid ScopeNodeId { get; set; }
    public Guid InviteeId { get; set; }
    public AttendanceCellInvitee? Invitee { get; set; }
    public AttendanceEntryStatus Status { get; set; } = AttendanceEntryStatus.Unrecorded;
    public bool WasFirstTimer { get; set; }
}
