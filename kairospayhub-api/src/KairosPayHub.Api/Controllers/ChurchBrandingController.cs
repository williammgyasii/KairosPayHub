using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/church")]
[Authorize]
public class ChurchBrandingController(CurrentActor current, ChurchBrandingService branding) : ControllerBase
{
    [HttpPost("logo")]
    [RequestSizeLimit(2_621_440)]
    public async Task<IActionResult> UploadLogo(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "File is required" });

        try
        {
            var actor = await current.RequireAsync(ct);
            await using var stream = file.OpenReadStream();
            var url = await branding.UploadLogoAsync(
                actor,
                stream,
                file.ContentType,
                file.Length,
                ct);
            return Ok(new { logoUrl = url });
        }
        catch (ObjectStorageNotConfiguredException)
        {
            return StatusCode(503, new { error = "File storage is not configured on the server" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    public record UpdateChurchProfileRequest(string Name);

    [HttpPatch]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateChurchProfileRequest body,
        CancellationToken ct)
    {
        try
        {
            var actor = await current.RequireAsync(ct);
            await branding.UpdateProfileAsync(actor, body.Name ?? "", ct);
            return Ok(new { ok = true });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (NotOnboardedException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }
}
