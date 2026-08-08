using KairosPayHub.Api.Domain;

namespace KairosPayHub.Api.Web;

public record OnboardRequest(string? OrganizationName, string? ChurchName);

public record CreateChurchRequest(string Name);

public record InviteLeaderRequest(string Email, string Name, Guid ChurchId);

public record ChurchDto(Guid Id, string Name);

public record StructureLayerDto(
    Guid Id,
    int SortOrder,
    string StandardType,
    string DisplayName);

public record StructureTemplateDto(Guid Id, string Name, IReadOnlyList<StructureLayerDto> Layers);

public record StructureNodeDto(
    Guid Id,
    Guid LayerId,
    Guid? ParentNodeId,
    string Name,
    string? UnitNumber,
    Guid? LeaderMemberId,
    string? LeaderName);

public record StructureMemberDto(
    Guid Id,
    Guid ParentNodeId,
    string Name,
    string? Email,
    string? Phone,
    int? Age,
    DateOnly? DateOfBirth,
    string? Residence,
    string? OccupationStatus,
    string? SchoolOrWorkplace,
    string Position);

public record StructureMemberListResponse(
    IReadOnlyList<StructureMemberDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record StructureTreeDto(
    Guid ChurchId,
    string ChurchName,
    StructureTemplateDto? Template,
    IReadOnlyList<StructureNodeDto> Nodes,
    IReadOnlyList<StructureMemberDto> Members);

public record StructureLayerInput(string StandardType, string DisplayName);

public record SetStructureTemplateRequest(string? Name, IReadOnlyList<StructureLayerInput> Layers);

public record EvolveStructureTemplateRequest(
    string Operation,
    string? Name,
    StructureLayerInput? Layer,
    int? AtSortOrder,
    IReadOnlyList<StructureLayerInput>? Layers,
    bool DryRun = true);

public record StructureEvolvePreviewDto(
    string Summary,
    int BridgeNodesCreated,
    int NodesReparented,
    int MembersMoved,
    IReadOnlyList<string> Details);

public record EvolveStructureTemplateResponse(
    StructureTemplateDto? Template,
    StructureEvolvePreviewDto Preview,
    bool Applied);

public record CreateGivingProgramRequest(
    string? GivingType,
    string? Title,
    string? PeriodLabel,
    string? ScopeKind,
    Guid? ScopeNodeId,
    IReadOnlyList<Guid>? ScopeNodeIds = null,
    Guid? ParentProgramId = null,
    bool? MoveParentContributions = null);

public record GivingProgramDto(
    Guid Id,
    Guid? ParentProgramId,
    string GivingType,
    string Title,
    string PeriodLabel,
    string ScopeKind,
    Guid? ScopeNodeId,
    string Status,
    string ApprovalStatus,
    string? CreatedByRole,
    string? CreatedByName,
    string? CreatedByScopeUnitName,
    DateTimeOffset CreatedAt,
    decimal TotalApprovedAmount,
    bool HasChildren,
    bool AcceptsContributions,
    int DirectContributionCount,
    decimal DirectContributionTotalAmount);

public record GivingProgramListResponse(IReadOnlyList<GivingProgramDto> Programs);

public record CreateContributionRequest(
    Guid MemberId,
    decimal Amount,
    string? Currency,
    DateTimeOffset DateSent,
    string AttachmentKey,
    string? Notes,
    bool? SentToPastor = null,
    string? RemittanceMedium = null,
    string? RemittanceMediumOther = null,
    Guid? BatchId = null);

public record RejectContributionRequest(string? Reason);

public record RejectSubGivingRequest(string? Reason);

public record ContributionDto(
    Guid Id,
    Guid ProgramId,
    string ProgramTitle,
    string ProgramPeriodLabel,
    bool IsSubGiving,
    bool IsLegacyParentContribution,
    Guid MemberId,
    string MemberName,
    decimal Amount,
    string Currency,
    DateTimeOffset DateSent,
    string AttachmentKey,
    string? AttachmentUrl,
    string? Notes,
    Guid MemberParentNodeId,
    string Status,
    string? EnteredByRole,
    string? EnteredByName,
    string? EnteredByScopeUnitName,
    bool? SentToPastor,
    string? RemittanceMedium,
    string? RemittanceMediumOther,
    Guid? BatchId,
    string? PendingApproverRole,
    DateTimeOffset? ApprovedAt,
    string? ApprovedByName,
    string? RejectedReason,
    DateTimeOffset CreatedAt);

public record ContributionListSummary(
    int PendingCount,
    decimal PendingTotalAmount,
    int AwaitingMyApprovalCount,
    int ApprovedCount,
    decimal ApprovedTotalAmount,
    int RejectedCount);

public record ContributionListResponse(
    IReadOnlyList<ContributionDto> Contributions,
    int TotalCount,
    int Page,
    int PageSize,
    ContributionListSummary Summary);

public record GivingAttachmentDto(string AttachmentKey, string Url);

public record GivingRollupRowDto(
    Guid NodeId,
    string NodeName,
    string LayerType,
    decimal TotalAmount,
    int ContributionCount);

public record GivingProgramRollupDto(
    Guid ProgramId,
    decimal TotalApprovedAmount,
    int TotalApprovedCount,
    bool IncludesDescendants,
    IReadOnlyList<GivingRollupRowDto> Rows);

public record GivingDashboardCampaignDto(
    Guid Id,
    string GivingType,
    string Title,
    string PeriodLabel,
    decimal TotalApprovedAmount,
    int SubPeriodCount);

public record GivingDashboardDto(
    int OpenCampaignCount,
    IReadOnlyList<GivingDashboardCampaignDto> Campaigns,
    string? ScopeUnitName = null,
    int FellowshipCount = 0,
    int CellCount = 0,
    int MemberCount = 0,
    int PendingApprovalCount = 0,
    decimal ScopedApprovedTotal = 0);

public record CreateStructureNodeRequest(
    Guid LayerId,
    Guid? ParentNodeId,
    string Name,
    string? UnitNumber,
    Guid? LeaderMemberId,
    NewStructureNodeLeaderRequest? NewLeader);

public record NewStructureNodeLeaderRequest(
    string Name,
    string? Email,
    string? Phone,
    DateOnly? DateOfBirth,
    string? Residence,
    string? OccupationStatus,
    string? SchoolOrWorkplace,
    string? InitialCellName,
    bool LeaderIsCellLeader = true);

public record GeneratedLeaderLoginDto(string Email, string TemporaryPassword);

public record CreateStructureNodeResponse(
    StructureNodeDto Node,
    GeneratedLeaderLoginDto? GeneratedLeaderLogin);

public record UpdateStructureNodeRequest(
    string Name,
    string? UnitNumber,
    Guid? LeaderMemberId,
    NewStructureNodeLeaderRequest? NewLeader);

public record LinkStructureNodeRequest(Guid? ParentNodeId);

public record LinkStructureMemberRequest(Guid ParentNodeId);

public record CreateStructureMemberRequest(
    string Name,
    Guid ParentNodeId,
    string? Email,
    string? Phone,
    int? Age,
    DateOnly? DateOfBirth,
    string? Residence,
    string? OccupationStatus,
    string? SchoolOrWorkplace,
    string? Position);

public record UpdateStructureMemberRequest(
    string Name,
    Guid ParentNodeId,
    string? Email,
    string? Phone,
    int? Age,
    DateOnly? DateOfBirth,
    string? Residence,
    string? OccupationStatus,
    string? SchoolOrWorkplace,
    string? Position);

// Legacy DTOs kept for reference during frontend migration
public record PfccDto(Guid Id, string Name);

public record FellowshipDto(Guid Id, string Name, Guid? PfccId);

public record CellDto(Guid Id, string Name, Guid FellowshipId);

public record MemberDto(Guid Id, string Name, Guid ParentNodeId, string? Email, string? Phone);

public record NotificationDto(
    Guid Id,
    string Kind,
    string Title,
    string Body,
    string? LinkPath,
    Guid? ProgramId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt);

public record NotificationListResponse(
    IReadOnlyList<NotificationDto> Notifications,
    int UnreadCount);

public record NotificationUnreadCountResponse(int UnreadCount);

public static class Mapping
{
    public static ChurchDto ToDto(this Church c) => new(c.Id, c.Name);
}
