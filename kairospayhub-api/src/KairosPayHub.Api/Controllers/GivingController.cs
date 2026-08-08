using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Storage;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/giving")]
[Authorize]
public class GivingController(
    CurrentActor current,
    GivingProgramService programs,
    ContributionService contributions) : ControllerBase
{
    [HttpGet("programs")]
    public async Task<IActionResult> ListPrograms(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var list = await programs.ListAsync(actor, ct);
        return Ok(new GivingProgramListResponse(list));
    }

    [HttpGet("programs/{programId:guid}")]
    public async Task<IActionResult> GetProgram(Guid programId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var program = await programs.GetAsync(actor, programId, ct);
        return Ok(program);
    }

    [HttpGet("programs/{programId:guid}/children")]
    public async Task<IActionResult> ListChildPrograms(Guid programId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var list = await programs.ListChildrenAsync(actor, programId, ct);
        return Ok(new GivingProgramListResponse(list));
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var dashboard = await programs.GetDashboardAsync(actor, ct);
        return Ok(dashboard);
    }

    [HttpPost("programs")]
    public async Task<IActionResult> CreateProgram(
        [FromBody] CreateGivingProgramRequest request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var program = await programs.CreateAsync(
            actor,
            authUserId,
            new CreateGivingProgramInput(
                request.GivingType ?? string.Empty,
                request.Title ?? string.Empty,
                request.PeriodLabel ?? string.Empty,
                request.ScopeKind ?? string.Empty,
                request.ScopeNodeId,
                request.ScopeNodeIds,
                request.ParentProgramId),
            ct);
        return Ok(program);
    }

    [HttpPost("attachments")]
    [RequestSizeLimit(5_242_880)]
    public async Task<IActionResult> UploadAttachment(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "File is required" });

        if (!Guid.TryParse(current.Sub, out _))
            throw new UnauthorizedAccessException("Token has no subject");

        try
        {
            var actor = await current.RequireAsync(ct);
            await using var stream = file.OpenReadStream();
            var attachment = await contributions.UploadAttachmentAsync(
                actor,
                stream,
                file.ContentType,
                file.Length,
                ct);
            return Ok(attachment);
        }
        catch (ObjectStorageNotConfiguredException)
        {
            return StatusCode(503, new { error = "File storage is not configured on the server" });
        }
    }

    [HttpGet("programs/{programId:guid}/contributions")]
    public async Task<IActionResult> ListContributions(
        Guid programId,
        [FromQuery] ContributionStatus? status,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var list = await contributions.ListForProgramAsync(actor, authUserId, programId, status, ct);
        return Ok(new ContributionListResponse(list));
    }

    [HttpPost("programs/{programId:guid}/contributions")]
    public async Task<IActionResult> CreateContribution(
        Guid programId,
        [FromBody] CreateContributionRequest request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var contribution = await contributions.CreateAsync(
            actor,
            authUserId,
            programId,
            new CreateContributionInput(
                request.MemberId,
                request.Amount,
                request.Currency,
                request.DateSent,
                request.AttachmentKey,
                request.Notes),
            ct);
        return Ok(contribution);
    }

    [HttpPost("programs/{programId:guid}/contributions/{contributionId:guid}/approve")]
    public async Task<IActionResult> ApproveContribution(
        Guid programId,
        Guid contributionId,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var contribution = await contributions.ApproveAsync(
            actor,
            authUserId,
            programId,
            contributionId,
            ct);
        return Ok(contribution);
    }

    [HttpPost("programs/{programId:guid}/contributions/{contributionId:guid}/reject")]
    public async Task<IActionResult> RejectContribution(
        Guid programId,
        Guid contributionId,
        [FromBody] RejectContributionRequest request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var contribution = await contributions.RejectAsync(
            actor,
            authUserId,
            programId,
            contributionId,
            request.Reason,
            ct);
        return Ok(contribution);
    }

    [HttpGet("programs/{programId:guid}/rollup")]
    public async Task<IActionResult> GetRollup(Guid programId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var rollup = await contributions.GetRollupAsync(actor, programId, ct);
        return Ok(rollup);
    }

    [HttpGet("me/contributions")]
    public async Task<IActionResult> ListMyContributions(CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var list = await contributions.ListMineAsync(actor, authUserId, ct);
        return Ok(new ContributionListResponse(list));
    }

    [HttpGet("members/{memberId:guid}/contributions")]
    public async Task<IActionResult> ListMemberContributions(Guid memberId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var list = await contributions.ListForMemberAsync(actor, authUserId, memberId, ct);
        return Ok(new ContributionListResponse(list));
    }
}
