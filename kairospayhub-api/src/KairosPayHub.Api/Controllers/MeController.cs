using KairosPayHub.Api.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(CurrentActor current) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var actor = await current.TryGetAsync(ct);
        if (actor is null)
        {
            return Ok(new
            {
                onboarded = false,
                email = current.Email,
                name = current.Name,
            });
        }

        return Ok(new
        {
            onboarded = true,
            id = actor.Id,
            organizationId = actor.OrganizationId,
            role = actor.Role,
            churchId = actor.ChurchId,
            email = current.Email,
            name = current.Name,
        });
    }
}
