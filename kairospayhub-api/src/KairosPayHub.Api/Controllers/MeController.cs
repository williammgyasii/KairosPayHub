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

        Guid? scopeNodeId = null;
        string? scopeUnitName = null;
        object rollCallScopes = Array.Empty<object>();
        if (actor.StructureRole is not null
            && actor.StructureChurchId != default
            && Guid.TryParse(current.Sub, out var authUserId))
        {
            var scopedNodeId = await db.RoleAssignments.AsNoTracking()
                .Where(r =>
                    r.ChurchId == actor.StructureChurchId
                    && r.AuthUserId == authUserId
                    && r.Role == actor.StructureRole)
                .Select(r => r.ScopeNodeId)
                .FirstOrDefaultAsync(ct);

            if (scopedNodeId is Guid nodeId)
            {
                scopeNodeId = nodeId;
                scopeUnitName = await db.StructureNodes.AsNoTracking()
                    .Where(n => n.Id == nodeId && n.ChurchId == actor.StructureChurchId)
                    .Select(n => n.Name)
                    .FirstOrDefaultAsync(ct);
            }

            rollCallScopes = await (
                from assignment in db.RoleAssignments.AsNoTracking()
                join node in db.StructureNodes.AsNoTracking()
                    on assignment.ScopeNodeId equals node.Id
                where assignment.ChurchId == actor.StructureChurchId
                    && assignment.AuthUserId == authUserId
                    && assignment.Role == Domain.Structure.ChurchRole.CellLeader
                    && assignment.ScopeNodeId != null
                orderby node.Name
                select new { scopeNodeId = node.Id, scopeUnitName = node.Name })
                .ToListAsync(ct);
        }

        return Ok(new
        {
            onboarded = true,
            id = actor.Id,
            churchId = actor.StructureChurchId != default ? actor.StructureChurchId : (Guid?)null,
            churchName,
            churchLogoUrl,
            organizationId = actor.OrganizationId,
            role,
            scopeNodeId,
            scopeUnitName,
            rollCallScopes,
            legacyChurchId = actor.ChurchId,
            email = current.Email,
            name = current.Name,
        });
    }
}
