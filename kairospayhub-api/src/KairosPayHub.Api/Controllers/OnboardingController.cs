using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
    /// Re-links legacy app users that share the same email after Identity re-registration.
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

        var email = current.Email?.Trim() ?? string.Empty;
        var legacyUser = await FindLegacyUserAsync(current.Sub, email, ct);

        if (legacyUser is not null)
            return Ok(await RelinkLegacyUserAsync(legacyUser, authUserId, churchName, ct));

        return Ok(await CreateFreshTenantAsync(authUserId, churchName, ct));
    }

    private async Task<User?> FindLegacyUserAsync(string authSubject, string email, CancellationToken ct)
    {
        var bySubject = await db.AppUsers.FirstOrDefaultAsync(u => u.AuthSubject == authSubject, ct);
        if (bySubject is not null)
            return bySubject;

        if (string.IsNullOrEmpty(email))
            return null;

        return await db.AppUsers.FirstOrDefaultAsync(
            u => u.Email.ToLower() == email.ToLower(),
            ct);
    }

    private async Task<object> RelinkLegacyUserAsync(
        User legacyUser,
        Guid authUserId,
        string churchName,
        CancellationToken ct)
    {
        var previousAuthSubject = legacyUser.AuthSubject;
        legacyUser.AuthSubject = current.Sub;
        legacyUser.Name = current.Name ?? legacyUser.Name;

        var assignment = await db.RoleAssignments
            .FirstOrDefaultAsync(r => r.AuthUserId == authUserId, ct);

        if (assignment is null && Guid.TryParse(previousAuthSubject, out var previousAuthUserId))
        {
            assignment = await db.RoleAssignments
                .FirstOrDefaultAsync(r => r.AuthUserId == previousAuthUserId, ct);
            if (assignment is not null)
                assignment.AuthUserId = authUserId;
        }

        if (assignment is null)
        {
            var orphanedPastorAssignments = await db.RoleAssignments
                .Where(r => r.Role == ChurchRole.Pastor && r.AuthUserId != authUserId)
                .ToListAsync(ct);

            if (orphanedPastorAssignments.Count == 1)
            {
                assignment = orphanedPastorAssignments[0];
                assignment.AuthUserId = authUserId;
            }
        }

        if (assignment is not null)
        {
            var church = await db.StructureChurches.FindAsync([assignment.ChurchId], ct);
            if (church is not null)
                church.Name = churchName;

            var org = await db.Organizations.FindAsync([legacyUser.OrganizationId], ct);
            if (org is not null)
                org.Name = churchName;

            await db.SaveChangesAsync(ct);

            return new
            {
                churchId = assignment.ChurchId,
                organizationId = legacyUser.OrganizationId,
                role = assignment.Role.ToString(),
                relinked = true,
            };
        }

        var organization = await db.Organizations.FindAsync([legacyUser.OrganizationId], ct);
        if (organization is null)
        {
            organization = new Organization { Name = churchName };
            db.Organizations.Add(organization);
            legacyUser.OrganizationId = organization.Id;
        }
        else
        {
            organization.Name = churchName;
        }

        var newChurch = new Domain.Structure.Church { Name = churchName };
        var pastorAssignment = new RoleAssignment
        {
            ChurchId = newChurch.Id,
            AuthUserId = authUserId,
            Role = ChurchRole.Pastor,
            IsPrimaryPastor = true,
        };

        db.StructureChurches.Add(newChurch);
        db.RoleAssignments.Add(pastorAssignment);
        await db.SaveChangesAsync(ct);

        return new
        {
            churchId = newChurch.Id,
            organizationId = organization.Id,
            role = ChurchRole.Pastor.ToString(),
        };
    }

    private async Task<object> CreateFreshTenantAsync(Guid authUserId, string churchName, CancellationToken ct)
    {
        var church = new Domain.Structure.Church { Name = churchName };
        var org = new Organization { Name = churchName };
        var assignment = new RoleAssignment
        {
            ChurchId = church.Id,
            AuthUserId = authUserId,
            Role = ChurchRole.Pastor,
            IsPrimaryPastor = true,
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

        return new
        {
            churchId = church.Id,
            organizationId = org.Id,
            role = ChurchRole.Pastor.ToString(),
        };
    }
}
