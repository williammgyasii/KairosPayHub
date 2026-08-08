namespace KairosPayHub.Api.Domain.Giving;

public enum GivingType
{
    Rhapsody,
    SundayService,
    SpecialProgram,
    FellowshipGiving,
}

public enum ProgramScopeKind
{
    ChurchWide,
    Fellowship,
    PFCC,
    FellowshipGroup,
}

public enum ProgramStatus
{
    Open,
    Closed,
}

public enum ProgramApprovalStatus
{
    Approved,
    PendingPastorApproval,
    Rejected,
}

public enum ContributionStatus
{
    PendingApproval,
    Approved,
    Rejected,
}

public class GivingProgram
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Domain.Structure.Church? Church { get; set; }
    public Guid? ParentProgramId { get; set; }
    public GivingProgram? ParentProgram { get; set; }
    public ICollection<GivingProgram> ChildPrograms { get; set; } = new List<GivingProgram>();
    public GivingType GivingType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string PeriodLabel { get; set; } = string.Empty;
    public ProgramScopeKind ScopeKind { get; set; }
    public Guid? ScopeNodeId { get; set; }
    public ProgramStatus Status { get; set; } = ProgramStatus.Open;
    public ProgramApprovalStatus ApprovalStatus { get; set; } = ProgramApprovalStatus.Approved;
    public Domain.Structure.ChurchRole? CreatedByRole { get; set; }
    public Guid? ReviewedByAuthUserId { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
    public Guid CreatedByAuthUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public int SortOrder { get; set; }

    public ICollection<GivingProgramScopeNode> ScopeNodes { get; set; } = new List<GivingProgramScopeNode>();
    public ICollection<Contribution> Contributions { get; set; } = new List<Contribution>();
}

public class GivingProgramScopeNode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProgramId { get; set; }
    public GivingProgram? Program { get; set; }
    public Guid StructureNodeId { get; set; }
}

public class Contribution
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProgramId { get; set; }
    public GivingProgram? Program { get; set; }
    public Guid MemberId { get; set; }
    public Domain.Structure.Member? Member { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "GHS";
    public DateTimeOffset DateSent { get; set; }
    public string AttachmentKey { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public Guid EnteredByAuthUserId { get; set; }
    public Guid MemberParentNodeId { get; set; }
    public ContributionStatus Status { get; set; } = ContributionStatus.PendingApproval;
    public Guid? ApprovedByAuthUserId { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public string? RejectedReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
