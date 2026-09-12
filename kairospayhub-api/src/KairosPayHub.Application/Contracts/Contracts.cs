using KairosPayHub.Api.Domain;

namespace KairosPayHub.Api.Web;

public record OnboardRequest(
    string? OrganizationName,
    string? ChurchName,
    string? Location = null,
    string? PastorName = null,
    int? MemberCount = null,
    string? CountryCode = null);

public record CreateChurchRequest(string Name);

public record UpdateMeProfileRequest(
    string? Name,
    string? Email,
    string? Phone,
    DateOnly? DateOfBirth,
    string? Residence,
    string? OccupationStatus,
    string? SchoolOrWorkplace,
    string? State = null,
    string? Workplace = null);

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
    string Position,
    int Responsiveness,
    string? State = null,
    string? Workplace = null,
    string RosterStatus = "Active",
    DateTimeOffset? CreatedAt = null);

public record MintJoinInviteRequest(int ExpiresInDays);

public record JoinInviteDto(string Token, DateTimeOffset ExpiresAt);

public record JoinInvitePreviewDto(
    string ChurchName,
    string UnitName,
    string? CountryCode,
    DateTimeOffset ExpiresAt);

public record JoinSubmitAckDto(bool Submitted = true);

public record SubmitJoinInviteRequest(
    string Name,
    string? Email,
    string? Phone,
    DateOnly? DateOfBirth,
    string? Residence,
    string? State,
    string? OccupationStatus,
    string? SchoolOrWorkplace,
    string? Workplace,
    string? TurnstileToken = null);

public record StructureMemberListResponse(
    IReadOnlyList<StructureMemberDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int PendingCount = 0);

public record MemberAttendanceHistoryItemDto(
    Guid EntryId,
    Guid OccurrenceId,
    DateOnly MeetingDate,
    Guid MeetingTypeId,
    string MeetingTypeTitle,
    string Status,
    Guid ScopeNodeId,
    string? ScopeUnitName);

public record MemberAttendanceHistorySummaryDto(
    int PresentCount,
    int AbsentCount,
    int RecordedCount);

public record MemberAttendanceMeetingTypeSummaryDto(
    Guid MeetingTypeId,
    string Title,
    int PresentCount,
    int AbsentCount,
    int RecordedCount);

public record MemberAttendanceHistoryResponse(
    IReadOnlyList<MemberAttendanceHistoryItemDto> Items,
    MemberAttendanceHistorySummaryDto Summary,
    IReadOnlyList<MemberAttendanceMeetingTypeSummaryDto> MeetingTypes,
    Guid? MeetingTypeId,
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

public record CreateFirstSubCampaignRequest(
    string? Title,
    string? PeriodLabel = null,
    string? ScopeKind = null,
    Guid? ScopeNodeId = null,
    IReadOnlyList<Guid>? ScopeNodeIds = null,
    DateOnly? EventDate = null,
    DateTimeOffset? LogOpensAt = null);

public record CreateGivingProgramRequest(
    string? GivingType,
    string? Title,
    string? PeriodLabel,
    string? ScopeKind,
    Guid? ScopeNodeId,
    IReadOnlyList<Guid>? ScopeNodeIds = null,
    Guid? ParentProgramId = null,
    bool? MoveParentContributions = null,
    DateOnly? StartsOn = null,
    DateOnly? EndsOn = null,
    DateTimeOffset? GoLiveAt = null,
    string? CustomTypeLabel = null,
    DateOnly? EventDate = null,
    DateTimeOffset? LogOpensAt = null,
    bool? ReceiveGivingsOnMain = null,
    CreateFirstSubCampaignRequest? FirstSubCampaign = null);

public record UpdateGivingProgramSettingsRequest(
    bool ReceiveGivingsOnMain,
    Guid? MoveDirectToProgramId = null,
    CreateFirstSubCampaignRequest? CreateSubThenMove = null);

public record BatchSubCampaignRequest(
    string Frequency,
    int DayOfWeek,
    DateOnly RangeStart,
    DateOnly RangeEnd,
    int LogOpensOffsetDays = 1,
    string? TitlePrefix = null,
    string? ScopeKind = null,
    Guid? ScopeNodeId = null,
    IReadOnlyList<Guid>? ScopeNodeIds = null);

public record BatchSubCampaignPreviewDto(
    int Count,
    IReadOnlyList<string> SampleTitles,
    IReadOnlyList<string> SampleEventDates);

public record BatchSubCampaignCreateResponse(IReadOnlyList<GivingProgramDto> Programs);

public record GivingProgramDto(
    Guid Id,
    Guid? ParentProgramId,
    string GivingType,
    string? CustomTypeLabel,
    string Title,
    string PeriodLabel,
    string? StartsOn,
    string? EndsOn,
    string? GoLiveAt,
    string? EventDate,
    string? LogOpensAt,
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
    bool ReceiveGivingsOnMain,
    int DirectContributionCount,
    decimal DirectContributionTotalAmount,
    int AwaitingMyApprovalCount);

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

public record CreateContributionBatchItemRequest(Guid MemberId, decimal Amount);

public record CreateContributionBatchRequest(
    DateTimeOffset DateSent,
    string AttachmentKey,
    IReadOnlyList<CreateContributionBatchItemRequest> Items,
    string? Currency = null,
    string? Notes = null,
    bool? SentToPastor = null,
    string? RemittanceMedium = null,
    string? RemittanceMediumOther = null);

public record ContributionBatchDto(Guid BatchId, IReadOnlyList<ContributionDto> Contributions);

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

public record MemberGivingCampaignDto(
    Guid ProgramId,
    string Title,
    Guid? ParentProgramId,
    decimal ApprovedAmount,
    int ApprovedCount);

public record MemberGivingTotalDto(
    int Rank,
    Guid MemberId,
    string MemberName,
    Guid MemberParentNodeId,
    decimal ApprovedTotal,
    int ApprovedCount,
    int PendingCount,
    decimal PendingTotal,
    DateTimeOffset? LastDateSent,
    IReadOnlyList<MemberGivingCampaignDto> Campaigns);

public record MemberGivingTotalsSummary(
    decimal ApprovedTotalAmount,
    int MemberCount,
    int GiversCount,
    int ApprovedPaymentCount,
    int PendingCount,
    decimal PendingTotalAmount);

public record MemberGivingTotalsResponse(
    IReadOnlyList<MemberGivingTotalDto> Members,
    int TotalCount,
    int Page,
    int PageSize,
    MemberGivingTotalsSummary Summary);

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
    NewStructureNodeLeaderRequest? NewLeader,
    Guid? ClientRequestId = null);

public record NewStructureNodeLeaderRequest(
    string Name,
    string? Email,
    string? Phone,
    DateOnly? DateOfBirth,
    string? Residence,
    string? OccupationStatus,
    string? SchoolOrWorkplace,
    string? InitialCellName,
    bool LeaderIsCellLeader = true,
    string? State = null,
    string? Workplace = null);

public record GeneratedLeaderLoginDto(string Email);

public record CreateStructureNodeResponse(
    StructureNodeDto Node,
    GeneratedLeaderLoginDto? GeneratedLeaderLogin);

public record UpdateStructureNodeRequest(
    string Name,
    string? UnitNumber,
    Guid? LeaderMemberId,
    NewStructureNodeLeaderRequest? NewLeader,
    bool ClearLeader = false);

public record LinkStructureNodeRequest(Guid? ParentNodeId);

public record LinkStructureMemberRequest(Guid ParentNodeId);

public record EmailAvailabilityDto(bool Available, string? Message);

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
    string? Position,
    int? Responsiveness,
    string? State = null,
    string? Workplace = null);

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
    string? Position,
    int? Responsiveness,
    string? State = null,
    string? Workplace = null);

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

public record AccessAbilityColumnDto(string Id, string Label);

public record AccessCellDto(string Ability, bool DefaultOn, bool EffectiveOn, bool Locked);

public record AccessRowDto(
    string SubjectKind,
    Guid? SubjectId,
    string Label,
    IReadOnlyList<AccessCellDto> Cells);

public record AccessGridResponse(
    IReadOnlyList<AccessAbilityColumnDto> Abilities,
    IReadOnlyList<AccessRowDto> Rows);

public record AccessChangeRequest(string SubjectKind, Guid? SubjectId, string Ability, bool Enabled);

public record SaveAccessRequest(IReadOnlyList<AccessChangeRequest> Changes);

public record SaveTablePreferenceRequest(Dictionary<string, bool>? Columns);

public static class Mapping
{
    public static ChurchDto ToDto(this Church c) => new(c.Id, c.Name);
}
