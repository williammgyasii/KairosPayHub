using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/leaders")]
[Authorize]
public class LeadersController(CurrentActor current, LeaderInviteService invites) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Invite([FromBody] InviteLeaderRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Email and Name are required" });

        var actor = await current.RequireAsync(ct);
        var user = await invites.InviteAsync(actor, request.Email.Trim(), request.Name.Trim(), request.ChurchId, ct);
        return Ok(new { id = user.Id, email = user.Email, churchId = user.ChurchId });
    }
}
