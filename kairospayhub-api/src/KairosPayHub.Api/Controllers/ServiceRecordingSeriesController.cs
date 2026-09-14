using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/service-recording-series")]
[Authorize]
public class ServiceRecordingSeriesController(
    CurrentActor current,
    ServiceRecordingSeriesService series) : ControllerBase
{
    public sealed record CreateSeriesRequest(string Name, string? Description);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var list = await series.ListAsync(actor, ct);
            return Ok(new { series = list });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateSeriesRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var created = await series.CreateAsync(actor, request.Name, request.Description, ct);
            return Ok(created);
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (BadRequestException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
