using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/churches")]
[Authorize]
public class ChurchesController(CurrentActor current, ChurchService churches) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var list = await churches.ListAsync(actor, ct);
        return Ok(list.Select(c => c.ToDto()));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateChurchRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });

        var actor = await current.RequireAsync(ct);
        var church = await churches.CreateAsync(actor, request.Name.Trim(), ct);
        return Ok(church.ToDto());
    }
}
