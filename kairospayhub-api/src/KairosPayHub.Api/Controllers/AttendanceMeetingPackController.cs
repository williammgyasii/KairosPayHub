using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/attendance/occurrences/{occurrenceId:guid}/pack")]
[Authorize]
public class AttendanceMeetingPackController(
    CurrentActor current,
    AttendanceMeetingPackService packs) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Guid occurrenceId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var pack = await packs.GetAsync(actor, authUserId, occurrenceId, ct);
        return pack is null ? NotFound() : Ok(pack);
    }

    [HttpPost]
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> Publish(
        Guid occurrenceId,
        [FromForm] string? note,
        [FromForm] List<Guid>? keepFileIds,
        [FromForm] List<IFormFile>? files,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var uploads = new List<(Stream, string, string, long)>();
        try
        {
            foreach (var file in files ?? [])
            {
                if (file.Length == 0)
                    continue;
                uploads.Add((file.OpenReadStream(), file.FileName, file.ContentType, file.Length));
            }

            var published = await packs.PublishAsync(
                actor,
                authUserId,
                occurrenceId,
                note,
                keepFileIds ?? [],
                uploads,
                ct);
            return Ok(published);
        }
        catch (ObjectStorageNotConfiguredException)
        {
            return StatusCode(503, new { error = "File storage is not configured on the server" });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (BadRequestException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        finally
        {
            foreach (var (stream, _, _, _) in uploads)
                await stream.DisposeAsync();
        }
    }

    [HttpGet("files/{fileId:guid}/download")]
    public async Task<IActionResult> Download(Guid occurrenceId, Guid fileId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var (stream, contentType, fileName) = await packs.DownloadAsync(
            actor,
            authUserId,
            occurrenceId,
            fileId,
            ct);
        return File(stream, contentType, fileName);
    }
}
