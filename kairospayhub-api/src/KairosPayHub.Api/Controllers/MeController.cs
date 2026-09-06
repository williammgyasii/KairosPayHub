using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Authorization;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(CurrentActor current, KairosDbContext db, AbilityResolver abilities) : ControllerBase
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

        var churchId = actor.StructureChurchId != default ? actor.StructureChurchId : (Guid?)null;
        var hasStructureTemplate = churchId is not null
            && await db.StructureTemplates.AsNoTracking().AnyAsync(t => t.ChurchId == churchId, ct);

        string? churchName = null;
        string? churchLogoUrl = null;
        string? location = null;
        string? pastorName = null;
        int? memberCount = null;
        string? countryCode = null;
        string? defaultCurrency = null;
        if (churchId is not null)
        {
            var church = await db.StructureChurches.AsNoTracking()
                .Where(c => c.Id == churchId)
                .Select(c => new
                {
                    c.Name,
                    c.LogoUrl,
                    c.Location,
                    c.PrimaryPastorName,
                    c.ApproximateMemberCount,
                    c.CountryCode,
                    c.DefaultCurrency,
                })
                .FirstOrDefaultAsync(ct);
            churchName = church?.Name;
            churchLogoUrl = church?.LogoUrl;
            location = church?.Location;
            pastorName = church?.PrimaryPastorName;
            memberCount = church?.ApproximateMemberCount;
            countryCode = church?.CountryCode;
            defaultCurrency = church?.DefaultCurrency;
        }

        if (actor.StructureRole == ChurchRole.Pastor
            && churchId is not null
            && !hasStructureTemplate)
        {
            var pending = abilities.Resolve(actor.StructureRole);
            return Ok(new
            {
                onboarded = false,
                email = current.Email,
                name = current.Name,
                churchId,
                churchName,
                location,
                pastorName,
                memberCount,
                countryCode,
                defaultCurrency,
                onboardingStep = "structure",
                role = actor.StructureRole?.ToString() ?? actor.Role.ToString(),
                abilities = pending.Abilities,
                abilityRules = pending.Rules,
                leadershipProfile = pending.Profile.ToString(),
            });
        }

        var role = actor.StructureRole?.ToString() ?? actor.Role.ToString();

        Guid? scopeNodeId = null;
        string? scopeUnitName = null;
        StructureLayerType? scopeLayerKind = null;
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
                var nodeInfo = await (
                    from n in db.StructureNodes.AsNoTracking()
                    join layer in db.StructureLayers.AsNoTracking() on n.LayerId equals layer.Id
                    where n.Id == nodeId && n.ChurchId == actor.StructureChurchId
                    select new { n.Name, layer.StandardType })
                    .FirstOrDefaultAsync(ct);
                scopeUnitName = nodeInfo?.Name;
                scopeLayerKind = nodeInfo?.StandardType;
            }

            rollCallScopes = await (
                from assignment in db.RoleAssignments.AsNoTracking()
                join node in db.StructureNodes.AsNoTracking()
                    on assignment.ScopeNodeId equals node.Id
                where assignment.ChurchId == actor.StructureChurchId
                    && assignment.AuthUserId == authUserId
                    && assignment.Role == ChurchRole.CellLeader
                    && assignment.ScopeNodeId != null
                orderby node.Name
                select new { scopeNodeId = node.Id, scopeUnitName = node.Name })
                .ToListAsync(ct);
        }

        var resolved = abilities.Resolve(actor.StructureRole, scopeLayerKind);

        return Ok(new
        {
            onboarded = true,
            id = actor.Id,
            churchId,
            churchName,
            churchLogoUrl,
            countryCode,
            defaultCurrency,
            organizationId = actor.OrganizationId,
            role,
            scopeNodeId,
            scopeUnitName,
            rollCallScopes,
            legacyChurchId = actor.ChurchId,
            email = current.Email,
            name = current.Name,
            abilities = resolved.Abilities,
            abilityRules = resolved.Rules,
            leadershipProfile = resolved.Profile.ToString(),
        });
    }
}
