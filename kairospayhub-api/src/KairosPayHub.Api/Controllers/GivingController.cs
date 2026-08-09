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
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var list = await programs.ListAsync(actor, authUserId, ct);
        return Ok(new GivingProgramListResponse(list));
    }

    [HttpGet("programs/{programId:guid}")]
    public async Task<IActionResult> GetProgram(Guid programId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var program = await programs.GetAsync(actor, authUserId, programId, ct);
        return Ok(program);
    }

    [HttpGet("programs/{programId:guid}/children")]
    public async Task<IActionResult> ListChildPrograms(Guid programId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var list = await programs.ListChildrenAsync(actor, authUserId, programId, ct);
        return Ok(new GivingProgramListResponse(list));
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var dashboard = await programs.GetDashboardAsync(actor, authUserId, ct);
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
                request.ParentProgramId,
                request.MoveParentContributions ?? false),
            ct);
        return Ok(program);
    }

    [HttpPost("programs/{programId:guid}/approve")]
    public async Task<IActionResult> ApproveSubGiving(Guid programId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var program = await programs.ApproveSubGivingAsync(actor, authUserId, programId, ct);
        return Ok(program);
    }

    [HttpPost("programs/{programId:guid}/reject")]
    public async Task<IActionResult> RejectSubGiving(
        Guid programId,
        [FromBody] RejectSubGivingRequest request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var program = await programs.RejectSubGivingAsync(
            actor,
            authUserId,
            programId,
            request.Reason,
            ct);
        return Ok(program);
    }

    [HttpPost("programs/{programId:guid}/close")]
    public async Task<IActionResult> CloseProgram(Guid programId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var program = await programs.CloseProgramAsync(actor, authUserId, programId, ct);
        return Ok(program);
    }

    [HttpPost("programs/{programId:guid}/reopen")]
    public async Task<IActionResult> ReopenProgram(Guid programId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var program = await programs.ReopenProgramAsync(actor, authUserId, programId, ct);
        return Ok(program);
    }

    [HttpDelete("programs/{programId:guid}")]
    public async Task<IActionResult> DeleteProgram(Guid programId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out _))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        await programs.DeleteProgramAsync(actor, programId, ct);
        return NoContent();
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
        catch (Amazon.S3.AmazonS3Exception ex)
        {
            return StatusCode(502, new { error = $"Could not upload to storage: {ex.Message}" });
        }
    }

    [HttpGet("attachments/content")]
    public async Task<IActionResult> GetAttachmentContent([FromQuery] string key, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(key))
            return BadRequest(new { error = "Attachment key is required" });

        if (!Guid.TryParse(current.Sub, out _))
            throw new UnauthorizedAccessException("Token has no subject");

        try
        {
            var actor = await current.RequireAsync(ct);
            var (stream, contentType) = await contributions.OpenAttachmentAsync(actor, key, ct);
            return File(stream, contentType);
        }
        catch (ObjectStorageNotConfiguredException)
        {
            return StatusCode(503, new { error = "File storage is not configured on the server" });
        }
    }

    [HttpGet("contributions")]
    public async Task<IActionResult> ListAllContributions(
        [FromQuery] Guid? programId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null,
        [FromQuery] ContributionStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] bool awaitingMyApproval = false,
        [FromQuery] Guid? batchId = null,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var list = await contributions.ListAllAsync(
            actor,
            authUserId,
            programId,
            page,
            pageSize,
            sortBy,
            sortDir,
            status,
            search,
            awaitingMyApproval,
            batchId,
            ct);
        return Ok(list);
    }

    [HttpGet("member-totals")]
    public async Task<IActionResult> ListMemberGivingTotals(
        [FromQuery] Guid? programId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var list = await contributions.ListMemberTotalsAsync(
            actor,
            authUserId,
            programId,
            page,
            pageSize,
            sortBy,
            sortDir,
            search,
            ct);
        return Ok(list);
    }

    [HttpGet("programs/{programId:guid}/contributions")]
    public async Task<IActionResult> ListContributions(
        Guid programId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null,
        [FromQuery] ContributionStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] bool awaitingMyApproval = false,
        [FromQuery] Guid? batchId = null,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var list = await contributions.ListForProgramAsync(
            actor,
            authUserId,
            programId,
            page,
            pageSize,
            sortBy,
            sortDir,
            status,
            search,
            awaitingMyApproval,
            batchId,
            ct);
        return Ok(list);
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
                request.Notes,
                request.SentToPastor,
                request.RemittanceMedium,
                request.RemittanceMediumOther,
                request.BatchId),
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
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var rollup = await contributions.GetRollupAsync(actor, authUserId, programId, ct);
        return Ok(rollup);
    }

    [HttpGet("me/contributions")]
    public async Task<IActionResult> ListMyContributions(CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var list = await contributions.ListMineAsync(actor, authUserId, ct);
        return Ok(WrapContributionList(list));
    }

    [HttpGet("members/{memberId:guid}/contributions")]
    public async Task<IActionResult> ListMemberContributions(Guid memberId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var list = await contributions.ListForMemberAsync(actor, authUserId, memberId, ct);
        return Ok(WrapContributionList(list));
    }

    private static ContributionListResponse WrapContributionList(IReadOnlyList<ContributionDto> list)
    {
        var pending = list.Where(c => c.Status == "PendingApproval").ToList();
        var approved = list.Where(c => c.Status == "Approved").ToList();
        var rejected = list.Where(c => c.Status == "Rejected").ToList();

        return new ContributionListResponse(
            list,
            list.Count,
            1,
            Math.Max(list.Count, 1),
            new ContributionListSummary(
                pending.Count,
                pending.Sum(c => c.Amount),
                0,
                approved.Count,
                approved.Sum(c => c.Amount),
                rejected.Count));
    }
}
