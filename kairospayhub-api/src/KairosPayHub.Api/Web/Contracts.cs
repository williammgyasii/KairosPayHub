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

public record PfccDto(Guid Id, string Name);

public record FellowshipDto(Guid Id, string Name, Guid? PfccId);

public record CellDto(Guid Id, string Name, Guid FellowshipId);

public record MemberDto(Guid Id, string Name, Guid CellId, string? Email, string? Phone);

public record StructureTreeDto(
    Guid ChurchId,
    string ChurchName,
    IReadOnlyList<PfccDto> Pfccs,
    IReadOnlyList<FellowshipDto> Fellowships,
    IReadOnlyList<CellDto> Cells,
    IReadOnlyList<MemberDto> Members);

public record CreatePfccRequest(string Name);

public record CreateFellowshipRequest(string Name, Guid? PfccId);

public record CreateCellRequest(string Name, Guid FellowshipId);

public record CreateMemberRequest(string Name, Guid CellId, string? Email, string? Phone);

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
