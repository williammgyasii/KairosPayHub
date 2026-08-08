using System.Security.Claims;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Auth;

public class NotOnboardedException(string message = "User has not completed onboarding")
    : Exception(message);

/// <summary>
/// Request-scoped resolver that turns the validated JWT into an app Actor by
/// looking up role assignments and legacy app users.
/// </summary>
public class CurrentActor(IHttpContextAccessor http, KairosDbContext db)
{
    private Actor? _cached;

    private ClaimsPrincipal Principal =>
        http.HttpContext?.User
        ?? throw new UnauthorizedAccessException("No authenticated user");

    public string Sub =>
        Principal.FindFirstValue("sub")
        ?? Principal.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("Token has no subject");

    public string? Email =>
        Principal.FindFirstValue("email") ?? Principal.FindFirstValue(ClaimTypes.Email);

    public string? Name => Principal.FindFirstValue("name") ?? Email;

    public async Task<Actor?> TryGetAsync(CancellationToken ct = default)
    {
        if (_cached is not null) return _cached;

        var sub = Sub;
        Guid? authUserId = Guid.TryParse(sub, out var parsed) ? parsed : null;

        RoleAssignment? assignment = authUserId is not null
            ? await db.RoleAssignments.AsNoTracking()
                .Where(r => r.AuthUserId == authUserId)
                .OrderBy(r => r.Role)
                .FirstOrDefaultAsync(ct)
            : null;

        var legacyUser = await db.AppUsers.AsNoTracking()
            .FirstOrDefaultAsync(u => u.AuthSubject == sub, ct);

        if (assignment is null && legacyUser is null)
            return null;

        if (assignment is not null)
        {
            _cached = new Actor(
                legacyUser?.Id ?? assignment.Id,
                legacyUser?.OrganizationId ?? assignment.ChurchId,
                MapLegacyRole(assignment.Role),
                legacyUser?.ChurchId,
                assignment.ChurchId,
                assignment.Role);
            return _cached;
        }

        _cached = new Actor(
            legacyUser!.Id,
            legacyUser.OrganizationId,
            legacyUser.Role,
            legacyUser.ChurchId);
        return _cached;
    }

    public async Task<Actor> RequireAsync(CancellationToken ct = default) =>
        await TryGetAsync(ct) ?? throw new NotOnboardedException();

    private static Role MapLegacyRole(ChurchRole role) =>
        role switch
        {
            ChurchRole.Pastor => Role.Pastor,
            _ => Role.Leader,
        };
}
