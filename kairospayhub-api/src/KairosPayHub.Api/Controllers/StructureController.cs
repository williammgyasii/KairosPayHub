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
    public async Task<IActionResult> GetTree([FromQuery] bool includeMembers = true, CancellationToken ct = default)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await structure.GetTreeAsync(actor, authUserId, includeMembers, ct));
    }

    [HttpGet("template")]
    public async Task<IActionResult> GetTemplate(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var template = await structure.GetTemplateAsync(actor, ct);
        return template is null ? NotFound() : Ok(template);
    }

    [HttpPut("template")]
    public async Task<IActionResult> SetTemplate(
        [FromBody] SetStructureTemplateRequest request,
        CancellationToken ct)
    {
        if (request.Layers is null || request.Layers.Count == 0)
            return BadRequest(new { error = "Layers are required" });

        var actor = await current.RequireAsync(ct);
        return Ok(await structure.SetTemplateAsync(actor, request.Name, request.Layers, ct));
    }

    [HttpPost("template/evolve")]
    public async Task<IActionResult> EvolveTemplate(
        [FromBody] EvolveStructureTemplateRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        return Ok(await structure.EvolveTemplateAsync(actor, request, ct));
    }

    [HttpDelete("template")]
    public async Task<IActionResult> DeleteTemplate(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        await structure.DeleteTemplateAsync(actor, ct);
        return NoContent();
    }

    [HttpPost("nodes")]
    public async Task<IActionResult> CreateNode(
        [FromBody] CreateStructureNodeRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });
        if (request.LayerId == Guid.Empty)
            return BadRequest(new { error = "LayerId is required" });

        var actor = await current.RequireAsync(ct);
        return Ok(await structure.CreateNodeAsync(
            actor,
            request.LayerId,
            request.ParentNodeId,
            request.Name,
            request.UnitNumber,
            request.LeaderMemberId,
            request.NewLeader,
            ct));
    }

    [HttpPatch("nodes/{nodeId:guid}")]
    public async Task<IActionResult> UpdateNode(
        Guid nodeId,
        [FromBody] UpdateStructureNodeRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });

        var actor = await current.RequireAsync(ct);
        return Ok(await structure.UpdateNodeAsync(
            actor,
            nodeId,
            request.Name,
            request.UnitNumber,
            request.LeaderMemberId,
            request.NewLeader,
            request.ClearLeader,
            ct));
    }

    [HttpDelete("nodes/{nodeId:guid}")]
    public async Task<IActionResult> DeleteNode(Guid nodeId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        await structure.DeleteNodeAsync(actor, nodeId, ct);
        return NoContent();
    }

    [HttpPatch("nodes/{nodeId:guid}/link")]
    public async Task<IActionResult> LinkNode(
        Guid nodeId,
        [FromBody] LinkStructureNodeRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        return Ok(await structure.LinkNodeAsync(actor, nodeId, request.ParentNodeId, ct));
    }

    [HttpGet("members")]
    public async Task<IActionResult> ListMembers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = "name",
        [FromQuery] string? sortDir = "asc",
        [FromQuery] string? search = null,
        [FromQuery] Guid? parentNodeId = null,
        [FromQuery] bool includeDescendants = true,
        CancellationToken ct = default)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await structure.ListMembersAsync(
            actor,
            authUserId,
            page,
            pageSize,
            sortBy,
            sortDir,
            search,
            parentNodeId,
            includeDescendants,
            ct));
    }

    [HttpGet("emails/check")]
    public async Task<IActionResult> CheckEmailAvailability(
        [FromQuery] string email,
        [FromQuery] string scope = "roster",
        [FromQuery] Guid? excludeMemberId = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { error = "Email is required" });

        var actor = await current.RequireAsync(ct);
        return Ok(await structure.CheckEmailAvailabilityAsync(actor, email, scope, excludeMemberId, ct));
    }

    [HttpPost("members")]
    public async Task<IActionResult> CreateMember(
        [FromBody] CreateStructureMemberRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });
        if (request.ParentNodeId == Guid.Empty)
            return BadRequest(new { error = "ParentNodeId is required" });

        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await structure.CreateMemberAsync(
            actor,
            authUserId,
            request.Name,
            request.ParentNodeId,
            request.Email,
            request.Phone,
            request.Age,
            request.DateOfBirth,
            request.Residence,
            StructureService.ParseMemberOccupationStatus(request.OccupationStatus),
            request.SchoolOrWorkplace,
            StructureService.ParseMemberPosition(request.Position),
            request.Responsiveness,
            ct));
    }

    [HttpPatch("members/{memberId:guid}")]
    public async Task<IActionResult> UpdateMember(
        Guid memberId,
        [FromBody] UpdateStructureMemberRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });
        if (request.ParentNodeId == Guid.Empty)
            return BadRequest(new { error = "ParentNodeId is required" });

        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await structure.UpdateMemberAsync(
            actor,
            authUserId,
            memberId,
            request.Name,
            request.ParentNodeId,
            request.Email,
            request.Phone,
            request.Age,
            request.DateOfBirth,
            request.Residence,
            StructureService.ParseMemberOccupationStatus(request.OccupationStatus),
            request.SchoolOrWorkplace,
            StructureService.ParseMemberPosition(request.Position),
            request.Responsiveness,
            ct));
    }

    [HttpDelete("members/{memberId:guid}")]
    public async Task<IActionResult> DeleteMember(Guid memberId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        await structure.DeleteMemberAsync(actor, authUserId, memberId, ct);
        return NoContent();
    }

    [HttpPatch("members/{memberId:guid}/link")]
    public async Task<IActionResult> LinkMember(
        Guid memberId,
        [FromBody] LinkStructureMemberRequest request,
        CancellationToken ct)
    {
        if (request.ParentNodeId == Guid.Empty)
            return BadRequest(new { error = "ParentNodeId is required" });

        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await structure.LinkMemberAsync(actor, authUserId, memberId, request.ParentNodeId, ct));
    }
}
