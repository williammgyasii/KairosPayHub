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

public sealed class ForbiddenException(string message = "Forbidden") : Exception(message);

public sealed class BadRequestException(string message) : Exception(message);
