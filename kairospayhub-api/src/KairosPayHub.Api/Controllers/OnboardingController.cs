using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
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
    /// First-login provisioning for a pastor: creates the church tenant, pastor
    /// role assignment, and legacy org row (for existing record flows).
    /// Idempotent — if the caller is already onboarded, returns existing membership.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Onboard([FromBody] OnboardRequest request, CancellationToken ct)
    {
        var churchName = (request.ChurchName ?? request.OrganizationName)?.Trim();
        if (string.IsNullOrWhiteSpace(churchName))
            return BadRequest(new { error = "ChurchName is required" });

        var existing = await current.TryGetAsync(ct);
        if (existing is not null)
        {
            return Ok(new
            {
                churchId = existing.StructureChurchId != default
                    ? existing.StructureChurchId
                    : existing.OrganizationId,
                organizationId = existing.OrganizationId,
                role = existing.StructureRole?.ToString() ?? existing.Role.ToString(),
                alreadyOnboarded = true,
            });
        }

        if (!Guid.TryParse(current.Sub, out var authUserId))
            return BadRequest(new { error = "Invalid auth subject" });

        var church = new Domain.Structure.Church { Name = churchName };
        var org = new Organization { Name = churchName };
        var assignment = new RoleAssignment
        {
            ChurchId = church.Id,
            AuthUserId = authUserId,
            Role = ChurchRole.Pastor,
        };
        var legacyUser = new User
        {
            OrganizationId = org.Id,
            AuthSubject = current.Sub,
            Name = current.Name ?? current.Email ?? "Pastor",
            Email = current.Email ?? string.Empty,
            Role = Role.Pastor,
        };

        db.StructureChurches.Add(church);
        db.Organizations.Add(org);
        legacyUser.OrganizationId = org.Id;
        assignment.ChurchId = church.Id;
        db.RoleAssignments.Add(assignment);
        db.AppUsers.Add(legacyUser);
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            churchId = church.Id,
            organizationId = org.Id,
            role = ChurchRole.Pastor.ToString(),
        });
    }
}
