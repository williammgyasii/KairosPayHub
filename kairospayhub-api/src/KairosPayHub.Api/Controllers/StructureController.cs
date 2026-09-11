using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using KairosPayHub.Application.Structure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/structure")]
[Authorize]
public class StructureController(
    CurrentActor current,
    StructureTreeService tree,
    StructureNodeService nodes,
    StructureMemberService members,
    StructureTemplateService templates,
    StructureTemplateEvolveService templateEvolve,
    DeleteStructureTemplate deleteTemplate) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetTree([FromQuery] bool includeMembers = true, CancellationToken ct = default)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await tree.GetTreeAsync(actor, authUserId, includeMembers, ct));
    }

    [HttpGet("template")]
    public async Task<IActionResult> GetTemplate(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var template = await templates.GetTemplateAsync(actor, ct);
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
        return Ok(await templates.SetTemplateAsync(actor, request.Name, request.Layers, ct));
    }

    [HttpPost("template/evolve")]
    public async Task<IActionResult> EvolveTemplate(
        [FromBody] EvolveStructureTemplateRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        return Ok(await templateEvolve.EvolveTemplateAsync(actor, request, ct));
    }

    [HttpDelete("template")]
    public async Task<IActionResult> DeleteTemplate(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        await deleteTemplate.ExecuteAsync(actor, ct);
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
        Guid.TryParse(current.Sub, out var authUserId);
        return Ok(await nodes.CreateNodeAsync(
            actor,
            request.LayerId,
            request.ParentNodeId,
            request.Name,
            request.UnitNumber,
            request.LeaderMemberId,
            request.NewLeader,
            request.ClientRequestId,
            authUserId,
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
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized();

        return Ok(await nodes.UpdateNodeAsync(
            actor,
            authUserId,
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
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized();
        await nodes.DeleteNodeAsync(actor, authUserId, nodeId, ct);
        return NoContent();
    }

    [HttpPatch("nodes/{nodeId:guid}/link")]
    public async Task<IActionResult> LinkNode(
        Guid nodeId,
        [FromBody] LinkStructureNodeRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        return Ok(await nodes.LinkNodeAsync(actor, nodeId, request.ParentNodeId, ct));
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
        [FromQuery] string? rosterStatus = null,
        CancellationToken ct = default)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await members.ListMembersAsync(
            actor,
            authUserId,
            page,
            pageSize,
            sortBy,
            sortDir,
            search,
            parentNodeId,
            includeDescendants,
            rosterStatus,
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
        return Ok(await members.CheckEmailAvailabilityAsync(actor, email, scope, excludeMemberId, ct));
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

        return Ok(await members.CreateMemberAsync(
            actor,
            authUserId,
            request.Name,
            request.ParentNodeId,
            request.Email,
            request.Phone,
            request.Age,
            request.DateOfBirth,
            request.Residence,
            StructureMemberService.ParseMemberOccupationStatus(request.OccupationStatus),
            request.SchoolOrWorkplace,
            StructureMemberService.ParseMemberPosition(request.Position),
            request.Responsiveness,
            request.State,
            request.Workplace,
            ct));
    }

    [HttpGet("members/{memberId:guid}")]
    public async Task<IActionResult> GetMember(Guid memberId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        return Ok(await members.GetMemberAsync(actor, authUserId, memberId, ct));
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

        return Ok(await members.UpdateMemberAsync(
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
            StructureMemberService.ParseMemberOccupationStatus(request.OccupationStatus),
            request.SchoolOrWorkplace,
            StructureMemberService.ParseMemberPosition(request.Position),
            request.Responsiveness,
            request.State,
            request.Workplace,
            ct));
    }

    [HttpDelete("members/{memberId:guid}")]
    public async Task<IActionResult> DeleteMember(Guid memberId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        await members.DeleteMemberAsync(actor, authUserId, memberId, ct);
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

        return Ok(await members.LinkMemberAsync(actor, authUserId, memberId, request.ParentNodeId, ct));
    }
}
