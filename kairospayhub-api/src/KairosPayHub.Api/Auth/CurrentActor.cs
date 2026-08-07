using System.Security.Claims;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Auth;

public class NotOnboardedException(string message = "User has not completed onboarding")
    : Exception(message);

/// <summary>
/// Request-scoped resolver that turns the validated JWT into an app Actor by
/// looking up the DB user (the authoritative source of org + role). Identity
/// comes from the token's `sub`; everything else comes from our database.
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
        var user = await db.AppUsers.AsNoTracking()
            .FirstOrDefaultAsync(u => u.AuthSubject == sub, ct);
        if (user is null) return null;

        _cached = new Actor(user.Id, user.OrganizationId, user.Role, user.ChurchId);
        return _cached;
    }

    public async Task<Actor> RequireAsync(CancellationToken ct = default) =>
        await TryGetAsync(ct) ?? throw new NotOnboardedException();
}
