using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/structure")]
[Authorize]
public class StructureController(CurrentActor current, StructureService structure) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetTree(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        return Ok(await structure.GetTreeAsync(actor, ct));
    }

    [HttpPost("pfccs")]
    public async Task<IActionResult> CreatePfcc([FromBody] CreatePfccRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });

        var actor = await current.RequireAsync(ct);
        return Ok(await structure.CreatePfccAsync(actor, request.Name, ct));
    }

    [HttpPost("fellowships")]
    public async Task<IActionResult> CreateFellowship(
        [FromBody] CreateFellowshipRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });

        var actor = await current.RequireAsync(ct);
        return Ok(await structure.CreateFellowshipAsync(actor, request.Name, request.PfccId, ct));
    }

    [HttpPost("cells")]
    public async Task<IActionResult> CreateCell([FromBody] CreateCellRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });
        if (request.FellowshipId == Guid.Empty)
            return BadRequest(new { error = "FellowshipId is required" });

        var actor = await current.RequireAsync(ct);
        return Ok(await structure.CreateCellAsync(actor, request.Name, request.FellowshipId, ct));
    }

    [HttpPost("members")]
    public async Task<IActionResult> CreateMember([FromBody] CreateMemberRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });
        if (request.CellId == Guid.Empty)
            return BadRequest(new { error = "CellId is required" });

        var actor = await current.RequireAsync(ct);
        return Ok(await structure.CreateMemberAsync(
            actor,
            request.Name,
            request.CellId,
            request.Email,
            request.Phone,
            ct));
    }
}
