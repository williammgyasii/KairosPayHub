using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/service-recording-categories")]
[Authorize]
public class ServiceRecordingCategoryController(
    CurrentActor current,
    ServiceRecordingCategoryService categories) : ControllerBase
{
    public sealed record CreateCategoryRequest(string Name);
    public sealed record RenameCategoryRequest(string Name);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var list = await categories.ListAsync(actor, ct);
            return Ok(new { categories = list });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateCategoryRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var created = await categories.CreateAsync(actor, request.Name, ct);
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

    [HttpPatch("{categoryId:guid}")]
    public async Task<IActionResult> Rename(
        Guid categoryId,
        [FromBody] RenameCategoryRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            var updated = await categories.RenameAsync(actor, categoryId, request.Name, ct);
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

    [HttpDelete("{categoryId:guid}")]
    public async Task<IActionResult> Delete(Guid categoryId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        try
        {
            await categories.DeleteAsync(actor, categoryId, ct);
            return NoContent();
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }
}
