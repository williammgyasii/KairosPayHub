using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/access")]
[Authorize]
public class AccessController(CurrentActor current, LayerAccessService access) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        return Ok(await access.GetGridAsync(actor, ct));
    }

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] SaveAccessRequest request, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        await access.SaveAsync(actor, request, ct);
        return Ok(await access.GetGridAsync(actor, ct));
    }
}
