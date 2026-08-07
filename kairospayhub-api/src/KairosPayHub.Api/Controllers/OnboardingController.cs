using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/onboarding")]
[Authorize]
public class OnboardingController(CurrentActor current, KairosDbContext db) : ControllerBase
{
    /// <summary>
    /// First-login provisioning for a pastor: creates their Organization and
    /// PASTOR user row. Idempotent — if the caller is already onboarded, returns
    /// the existing membership. Leaders never hit this (they're invited).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Onboard([FromBody] OnboardRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.OrganizationName))
            return BadRequest(new { error = "OrganizationName is required" });

        var existing = await current.TryGetAsync(ct);
        if (existing is not null)
        {
            return Ok(new
            {
                organizationId = existing.OrganizationId,
                role = existing.Role,
                alreadyOnboarded = true,
            });
        }

        var org = new Organization { Name = request.OrganizationName.Trim() };
        db.Organizations.Add(org);
        db.AppUsers.Add(new User
        {
            OrganizationId = org.Id,
            AuthSubject = current.Sub,
            Name = current.Name ?? current.Email ?? "Pastor",
            Email = current.Email ?? string.Empty,
            Role = Role.Pastor,
        });
        await db.SaveChangesAsync(ct);

        return Ok(new { organizationId = org.Id, role = Role.Pastor });
    }
}
