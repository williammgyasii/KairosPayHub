using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/settings/administrators")]
[Authorize]
public class SettingsAdministratorsController(
    CurrentActor current,
    ChurchAdministratorService administrators) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var list = await administrators.ListAsync(actor, ct);
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateChurchAdministratorRequest request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var created = await administrators.CreateAsync(
            actor,
            authUserId,
            new CreateChurchAdministratorInput(
                request.FirstName ?? string.Empty,
                request.LastName ?? string.Empty,
                request.Email ?? string.Empty,
                request.AffiliationKind ?? "External",
                request.MemberId,
                request.Password,
                request.SendInviteEmail ?? false),
            ct);
        return Ok(created);
    }

    [HttpPost("suggest-email")]
    public async Task<IActionResult> SuggestEmail(
        [FromBody] SuggestAdminEmailRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        _ = actor;
        var suggested = await administrators.SuggestEmailAsync(request.BaseEmail ?? string.Empty, ct);
        return Ok(new { email = suggested });
    }

    [HttpPatch("{administratorId:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(Guid administratorId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        await administrators.DeactivateAsync(actor, authUserId, administratorId, ct);
        return Ok(new { ok = true });
    }
}

public sealed class CreateChurchAdministratorRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? AffiliationKind { get; set; }
    public Guid? MemberId { get; set; }
    public string? Password { get; set; }
    public bool? SendInviteEmail { get; set; }
}

public sealed class SuggestAdminEmailRequest
{
    public string? BaseEmail { get; set; }
}
