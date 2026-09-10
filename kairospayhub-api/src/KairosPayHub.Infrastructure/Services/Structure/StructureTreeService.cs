using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Structure tree reads (cached). Extracted from StructureService.
/// </summary>
public class StructureTreeService(
    KairosDbContext db,
    GivingScopeService givingScope,
    ChurchReadCache readCache)
{
    public async Task<StructureTreeDto> GetTreeAsync(
        Actor actor,
        Guid authUserId,
        bool includeMembers = true,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var role = actor.StructureRole?.ToString() ?? actor.Role.ToString();
        var cacheKey = readCache.StructureTreeKey(churchId, authUserId, role, includeMembers);
        return await readCache.GetOrCreateAsync(
            cacheKey,
            ChurchReadCache.StructureTreeTtl,
            innerCt => BuildTreeAsync(actor, authUserId, churchId, includeMembers, innerCt),
            ct);
    }

    private async Task<StructureTreeDto> BuildTreeAsync(
        Actor actor,
        Guid authUserId,
        Guid churchId,
        bool includeMembers,
        CancellationToken ct)
    {
        var church = await db.StructureChurches.AsNoTracking()
            .SingleAsync(c => c.Id == churchId, ct);

        var template = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct);

        var nodeEntities = await db.StructureNodes.AsNoTracking()
            .Include(n => n.Leader)
            .Where(n => n.ChurchId == churchId)
            .OrderBy(n => n.Name)
            .ToListAsync(ct);

        if (!givingScope.CanManageChurch(actor))
        {
            var subtreeIds = await givingScope.GetActorStructureSubtreeNodeIdsAsync(actor, authUserId, ct);
            if (subtreeIds.Count == 0)
            {
                nodeEntities = [];
            }
            else
            {
                nodeEntities = nodeEntities.Where(n => subtreeIds.Contains(n.Id)).ToList();
            }
        }

        var memberDtos = Array.Empty<StructureMemberDto>();
        if (includeMembers)
        {
            var members = await db.ChurchMembers.AsNoTracking()
                .Where(m => m.ChurchId == churchId)
                .OrderBy(m => m.Name)
                .ToListAsync(ct);

            if (!givingScope.CanManageChurch(actor))
            {
                var subtreeIds = await givingScope.GetActorStructureSubtreeNodeIdsAsync(actor, authUserId, ct);
                members = subtreeIds.Count == 0
                    ? []
                    : members.Where(m => subtreeIds.Contains(m.ParentNodeId)).ToList();
            }

            memberDtos = members.Select(StructureMemberService.ToMemberDto).ToArray();
        }

        var memberNames = memberDtos.ToDictionary(m => m.Id, m => m.Name);
        var nodes = nodeEntities
            .Select(n => StructureNodeService.ToNodeDto(n, memberNames))
            .ToList();

        return new StructureTreeDto(
            church.Id,
            church.Name,
            template is null ? null : StructureTemplateService.ToTemplateDto(template),
            nodes,
            memberDtos);
    }


    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }
}
