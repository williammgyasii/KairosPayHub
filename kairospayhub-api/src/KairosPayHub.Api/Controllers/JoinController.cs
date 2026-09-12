using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/join")]
public class JoinController(UnitJoinInviteService invites, ITurnstileVerifier turnstile) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("{token}")]
    public async Task<IActionResult> Preview(string token, CancellationToken ct) =>
        Ok(await invites.PreviewAsync(token, ct));

    [AllowAnonymous]
    [EnableRateLimiting("join-submit")]
    [HttpPost("{token}")]
    public async Task<IActionResult> Submit(
        string token,
        [FromBody] SubmitJoinInviteRequest request,
        CancellationToken ct)
    {
        var blocked = await TurnstileGate.RejectUnlessValidAsync(
            this, turnstile, "join", request.TurnstileToken, ct);
        if (blocked is not null) return blocked;

        await invites.SubmitAsync(token, request, ct);
        return Ok(new JoinSubmitAckDto(true));
    }
}
