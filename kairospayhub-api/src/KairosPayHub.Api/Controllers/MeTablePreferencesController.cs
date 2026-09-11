using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/me/table-preferences")]
[Authorize]
public class MeTablePreferencesController(CurrentActor current, UserTablePreferenceService prefs) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized();

        return Ok(new { preferences = await prefs.ListAsync(authUserId, ct) });
    }

    [HttpPut("{key}")]
    public async Task<IActionResult> Put(string key, [FromBody] SaveTablePreferenceRequest request, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized();

        var columns = await prefs.UpsertAsync(authUserId, key, request.Columns, ct);
        return Ok(new { key, columns });
    }
}
