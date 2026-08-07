using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Api.Domain;

/// <summary>
/// The authenticated caller as the app sees it: identity + tenant + role,
/// plus the leader's church. Derived from the verified JWT + DB row, never
/// from client-supplied input.
/// </summary>
public sealed record Actor(
    Guid Id,
    Guid OrganizationId,
    Role Role,
    Guid? ChurchId = null,
    Guid StructureChurchId = default,
    ChurchRole? StructureRole = null);

/// <summary>Minimal record projection needed to make an authorization decision.</summary>
public sealed record RecordForAuthz(
    Guid Id,
    Guid OrganizationId,
    Guid SubmittedById,
    RecordStatus Status);

/// <summary>The state change produced by verifying a record.</summary>
public sealed record VerifyResult(RecordStatus Status, Guid VerifiedById, DateTimeOffset VerifiedAt);

public sealed class ForbiddenException(string message = "Forbidden") : Exception(message);

public static class RecordAuthorization
{
    /// <summary>
    /// Records are only ever touchable within the actor's own organization.
    /// Pastors may correct any record in their org (even VERIFIED); leaders
    /// may edit only their own record while it is still SUBMITTED.
    /// </summary>
    public static bool CanEditRecord(RecordForAuthz record, Actor actor)
    {
        if (record.OrganizationId != actor.OrganizationId)
            return false;
        if (actor.Role == Role.Pastor)
            return true;
        return record.SubmittedById == actor.Id && record.Status == RecordStatus.Submitted;
    }

    public static VerifyResult VerifyRecord(RecordForAuthz record, Actor actor)
    {
        if (record.OrganizationId != actor.OrganizationId)
            throw new ForbiddenException("Cannot verify a record in another organization");
        if (actor.Role != Role.Pastor)
            throw new ForbiddenException("Only a pastor can verify records");
        if (record.Status == RecordStatus.Verified)
            throw new ForbiddenException("Record is already verified");

        return new VerifyResult(RecordStatus.Verified, actor.Id, DateTimeOffset.UtcNow);
    }
}
