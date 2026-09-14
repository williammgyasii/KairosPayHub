using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/service-recordings")]
[Authorize]
public class ServiceRecordingController(
    CurrentActor current,
    ServiceRecordingService recordings,
    ServiceRecordingThumbnailService thumbnails) : ControllerBase
{
    public sealed record CreateServiceRecordingRequest(
        string Title,
        string? Description,
        DateOnly? ServiceDate,
        Guid? CategoryId,
        Guid? SeriesId);

    public sealed record UpdateServiceRecordingRequest(
        string Title,
        string? Description,
        DateOnly? ServiceDate,
        Guid? CategoryId,
        Guid? SeriesId);

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] Guid? categoryId,
        [FromQuery] Guid? seriesId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken ct = default)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var pageResult = await recordings.ListAsync(
                actor,
                q,
                categoryId,
                seriesId,
                page,
                pageSize,
                ct);
            return Ok(new
            {
                recordings = pageResult.Recordings,
                total = pageResult.Total,
                page = pageResult.Page,
                pageSize = pageResult.PageSize,
            });
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

    [HttpGet("{recordingId:guid}")]
    public async Task<IActionResult> Get(Guid recordingId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var detail = await recordings.GetAsync(actor, recordingId, ct);
            return detail is null ? NotFound() : Ok(detail);
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateServiceRecordingRequest request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        try
        {
            var created = await recordings.CreateAsync(
                actor,
                authUserId,
                request.Title,
                request.Description,
                request.ServiceDate,
                request.CategoryId,
                request.SeriesId,
                ct);
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
        catch (InvalidOperationException ex) when (ex.Message.Contains("Bunny", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    [HttpPatch("{recordingId:guid}")]
    public async Task<IActionResult> Update(
        Guid recordingId,
        [FromBody] UpdateServiceRecordingRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var updated = await recordings.UpdateAsync(
                actor,
                recordingId,
                request.Title,
                request.Description,
                request.ServiceDate,
                request.CategoryId,
                request.SeriesId,
                ct);
            return Ok(updated);
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

    [HttpPost("{recordingId:guid}/publish")]
    public async Task<IActionResult> Publish(Guid recordingId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var published = await recordings.PublishAsync(actor, recordingId, ct);
            return Ok(published);
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

    [HttpPost("{recordingId:guid}/unpublish")]
    public async Task<IActionResult> Unpublish(Guid recordingId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var unpublished = await recordings.UnpublishAsync(actor, recordingId, ct);
            return Ok(unpublished);
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

    [HttpDelete("{recordingId:guid}")]
    public async Task<IActionResult> Delete(Guid recordingId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            await recordings.DeleteAsync(actor, recordingId, ct);
            return NoContent();
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Bunny", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    [HttpPost("{recordingId:guid}/thumbnail")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadThumbnail(
        Guid recordingId,
        IFormFile file,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            await using var stream = file.OpenReadStream();
            var url = await thumbnails.UploadCustomThumbnailAsync(
                actor,
                recordingId,
                stream,
                file.ContentType,
                file.Length,
                ct);
            return Ok(new { thumbnailUrl = url });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (BadRequestException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (ObjectStorageNotConfiguredException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    [HttpGet("{recordingId:guid}/playback")]
    public async Task<IActionResult> Playback(Guid recordingId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var playback = await recordings.GetPlaybackAsync(actor, recordingId, ct);
            return Ok(playback);
        }
        catch (ForbiddenException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Bunny", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }
}
