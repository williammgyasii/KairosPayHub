using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(CurrentActor current, KairosDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var actor = await current.TryGetAsync(ct);
        if (actor is null)
        {
            return Ok(new
            {
                onboarded = false,
                email = current.Email,
                name = current.Name,
            });
        }

        string? churchName = null;
        string? churchLogoUrl = null;
        if (actor.StructureChurchId != default)
        {
            var church = await db.StructureChurches.AsNoTracking()
                .Where(c => c.Id == actor.StructureChurchId)
                .Select(c => new { c.Name, c.LogoUrl })
                .FirstOrDefaultAsync(ct);
            churchName = church?.Name;
            churchLogoUrl = church?.LogoUrl;
        }

        var role = actor.StructureRole?.ToString() ?? actor.Role.ToString();

        return Ok(new
        {
            onboarded = true,
            id = actor.Id,
            churchId = actor.StructureChurchId != default ? actor.StructureChurchId : (Guid?)null,
            churchName,
            churchLogoUrl,
            organizationId = actor.OrganizationId,
            role,
            legacyChurchId = actor.ChurchId,
            email = current.Email,
            name = current.Name,
        });
    }
}
