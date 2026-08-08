using KairosPayHub.Api.Domain;

namespace KairosPayHub.Api.Web;

public record OnboardRequest(string? OrganizationName, string? ChurchName);

public record CreateChurchRequest(string Name);

public record InviteLeaderRequest(string Email, string Name, Guid ChurchId);

public record SubmitRecordRequest(
    Guid ChurchId,
    decimal Amount,
    DateTimeOffset DateSent,
    PaymentMethod Method,
    string? Reference,
    string? Currency);

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

public record RecordDto(
    Guid Id,
    Guid ChurchId,
    Guid SubmittedById,
    decimal Amount,
    string Currency,
    DateTimeOffset DateSent,
    PaymentMethod Method,
    string? Reference,
    RecordStatus Status,
    Guid? VerifiedById,
    DateTimeOffset? VerifiedAt);

public static class Mapping
{
    public static ChurchDto ToDto(this Church c) => new(c.Id, c.Name);

    public static RecordDto ToDto(this Record r) => new(
        r.Id,
        r.ChurchId,
        r.SubmittedById,
        r.Amount,
        r.Currency,
        r.DateSent,
        r.Method,
        r.Reference,
        r.Status,
        r.VerifiedById,
        r.VerifiedAt);
}
