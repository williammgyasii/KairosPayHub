using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/structure")]
[Authorize]
public class JoinInviteController(CurrentActor current, UnitJoinInviteService invites) : ControllerBase
{
    [HttpPost("nodes/{nodeId:guid}/join-invite")]
    public async Task<IActionResult> Mint(
        Guid nodeId,
        [FromBody] MintJoinInviteRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await invites.MintAsync(actor, authUserId, nodeId, request.ExpiresInDays, ct));
    }

    [HttpGet("nodes/{nodeId:guid}/join-invite")]
    public async Task<IActionResult> GetCurrent(Guid nodeId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var invite = await invites.GetCurrentAsync(actor, authUserId, nodeId, ct);
        return invite is null ? NotFound() : Ok(invite);
    }

    [HttpPost("members/{memberId:guid}/accept-join")]
    public async Task<IActionResult> Accept(Guid memberId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await invites.AcceptAsync(actor, authUserId, memberId, ct));
    }

    [HttpPost("members/{memberId:guid}/decline-join")]
    public async Task<IActionResult> Decline(Guid memberId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        await invites.DeclineAsync(actor, authUserId, memberId, ct);
        return NoContent();
    }
}
