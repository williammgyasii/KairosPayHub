using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public record CreateGivingProgramInput(
    string GivingType,
    string Title,
    string PeriodLabel,
    string ScopeKind,
    Guid? ScopeNodeId = null,
    IReadOnlyList<Guid>? ScopeNodeIds = null,
    Guid? ParentProgramId = null);

public class GivingProgramService(KairosDbContext db, GivingScopeService scope)
{
    public async Task<IReadOnlyList<GivingProgramDto>> ListAsync(
        Actor actor,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        var programs = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId == null)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return programs.Select(p => ToDto(p, parentIdsWithChildren)).ToList();
    }

    public async Task<IReadOnlyList<GivingProgramDto>> ListChildrenAsync(
        Actor actor,
        Guid parentProgramId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        _ = await db.GivingPrograms.AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == parentProgramId && p.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Program not found");

        var programs = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId == parentProgramId)
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.CreatedAt)
            .ToListAsync(ct);

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return programs.Select(p => ToDto(p, parentIdsWithChildren)).ToList();
    }

    public async Task<GivingProgramDto> GetAsync(
        Actor actor,
        Guid programId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var program = await db.GivingPrograms.AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == programId && p.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Program not found");

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return ToDto(program, parentIdsWithChildren);
    }

    public async Task<GivingDashboardDto> GetDashboardAsync(
        Actor actor,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        if (!scope.IsPastor(actor))
            throw new ForbiddenException("Only a pastor can view the giving dashboard");

        var roots = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId == null && p.Status == ProgramStatus.Open)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        var links = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId != null)
            .Select(p => new { p.Id, p.ParentProgramId })
            .ToListAsync(ct);

        var childrenByParent = links
            .GroupBy(l => l.ParentProgramId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

        var allProgramIds = roots.Select(r => r.Id).ToList();
        foreach (var root in roots)
            allProgramIds.AddRange(CollectDescendantIds(root.Id, childrenByParent));

        var approvedByProgram = await db.Contributions.AsNoTracking()
            .Where(c => allProgramIds.Contains(c.ProgramId) && c.Status == ContributionStatus.Approved)
            .GroupBy(c => c.ProgramId)
            .Select(g => new { ProgramId = g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.ProgramId, x => x.Total, ct);

        var campaigns = roots.Select(root =>
        {
            var descendantIds = CollectDescendantIds(root.Id, childrenByParent);
            var programIds = new List<Guid> { root.Id };
            programIds.AddRange(descendantIds);
            var total = programIds.Sum(id => approvedByProgram.GetValueOrDefault(id));
            return new GivingDashboardCampaignDto(
                root.Id,
                root.GivingType.ToString(),
                root.Title,
                root.PeriodLabel,
                total,
                descendantIds.Count);
        }).ToList();

        return new GivingDashboardDto(campaigns.Count, campaigns);
    }

    public async Task<GivingProgramDto> CreateAsync(
        Actor actor,
        Guid createdByAuthUserId,
        CreateGivingProgramInput input,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var title = input.Title.Trim();
        var periodLabel = input.PeriodLabel.Trim();

        if (string.IsNullOrWhiteSpace(title))
            throw new BadRequestException("Title is required");
        if (string.IsNullOrWhiteSpace(periodLabel))
            throw new BadRequestException("Period label is required");

        GivingProgram? parent = null;
        GivingType givingType;
        var scopeKind = ParseScopeKind(input.ScopeKind);

        if (input.ParentProgramId is not null)
        {
            parent = await db.GivingPrograms.AsNoTracking()
                .SingleOrDefaultAsync(
                    p => p.Id == input.ParentProgramId && p.ChurchId == churchId,
                    ct)
                ?? throw new BadRequestException("Parent program not found");

            givingType = parent.GivingType;
            if (!scope.IsPastor(actor))
                throw new ForbiddenException("Only a pastor can create sub-periods");

            await scope.ValidateChildScopeWithinParentAsync(
                churchId,
                parent,
                scopeKind,
                input.ScopeNodeId,
                input.ScopeNodeIds,
                ct);
        }
        else
        {
            givingType = ParseGivingType(input.GivingType);
            await ValidateCreatePermissionAsync(actor, createdByAuthUserId, scopeKind, input, ct);

            if (scopeKind == ProgramScopeKind.ChurchWide)
            {
                var exists = await db.GivingPrograms.AnyAsync(
                    p => p.ChurchId == churchId
                        && p.ParentProgramId == null
                        && p.GivingType == givingType
                        && p.PeriodLabel == periodLabel
                        && p.ScopeKind == ProgramScopeKind.ChurchWide,
                    ct);
                if (exists)
                {
                    throw new BadRequestException(
                        $"A church-wide {givingType} program already exists for {periodLabel}.");
                }
            }
        }

        if (scopeKind is ProgramScopeKind.Fellowship or ProgramScopeKind.PFCC && input.ScopeNodeId is null)
            throw new BadRequestException("ScopeNodeId is required for scoped programs");

        if (scopeKind == ProgramScopeKind.FellowshipGroup
            && (input.ScopeNodeIds is null || input.ScopeNodeIds.Count == 0))
            throw new BadRequestException("At least one fellowship must be selected");

        var sortOrder = 0;
        if (parent is not null)
        {
            sortOrder = await db.GivingPrograms
                .Where(p => p.ParentProgramId == parent.Id)
                .Select(p => (int?)p.SortOrder)
                .MaxAsync(ct) ?? -1;
            sortOrder += 1;
        }

        var program = new GivingProgram
        {
            ChurchId = churchId,
            ParentProgramId = input.ParentProgramId,
            GivingType = givingType,
            Title = title,
            PeriodLabel = periodLabel,
            ScopeKind = scopeKind,
            ScopeNodeId = input.ScopeNodeId,
            Status = ProgramStatus.Open,
            CreatedByAuthUserId = createdByAuthUserId,
            SortOrder = sortOrder,
        };

        db.GivingPrograms.Add(program);

        if (scopeKind == ProgramScopeKind.FellowshipGroup && input.ScopeNodeIds is not null)
        {
            foreach (var nodeId in input.ScopeNodeIds.Distinct())
            {
                db.GivingProgramScopeNodes.Add(new GivingProgramScopeNode
                {
                    ProgramId = program.Id,
                    StructureNodeId = nodeId,
                });
            }
        }

        await db.SaveChangesAsync(ct);
        return ToDto(program, new HashSet<Guid>());
    }

    private async Task ValidateCreatePermissionAsync(
        Actor actor,
        Guid authUserId,
        ProgramScopeKind scopeKind,
        CreateGivingProgramInput input,
        CancellationToken ct)
    {
        if (scopeKind == ProgramScopeKind.ChurchWide)
        {
            if (!scope.IsPastor(actor))
                throw new ForbiddenException("Only a pastor can create church-wide giving programs");
            return;
        }

        if (scopeKind == ProgramScopeKind.Fellowship)
        {
            if (actor.StructureRole != ChurchRole.FellowshipLeader && !scope.IsPastor(actor))
                throw new ForbiddenException("Only a fellowship leader can create fellowship-scoped programs");
            await ValidateScopeNodeAsync(actor, authUserId, input.ScopeNodeId, ct);
            return;
        }

        if (scopeKind == ProgramScopeKind.PFCC)
        {
            if (actor.StructureRole != ChurchRole.PFCCManager && !scope.IsPastor(actor))
                throw new ForbiddenException("Only a PFCC manager can create PFCC-scoped programs");
            await ValidateScopeNodeAsync(actor, authUserId, input.ScopeNodeId, ct);
            return;
        }

        if (scopeKind == ProgramScopeKind.FellowshipGroup)
        {
            if (actor.StructureRole != ChurchRole.FellowshipLeader
                && actor.StructureRole != ChurchRole.PFCCManager
                && !scope.IsPastor(actor))
            {
                throw new ForbiddenException("You cannot create grouped fellowship programs");
            }

            foreach (var nodeId in input.ScopeNodeIds ?? [])
                await ValidateScopeNodeAsync(actor, authUserId, nodeId, ct);
        }
    }

    private async Task ValidateScopeNodeAsync(
        Actor actor,
        Guid authUserId,
        Guid? scopeNodeId,
        CancellationToken ct)
    {
        if (scopeNodeId is null)
            throw new BadRequestException("ScopeNodeId is required");

        var node = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == scopeNodeId && n.ChurchId == actor.StructureChurchId, ct)
            ?? throw new BadRequestException("Scope node not found");

        if (scope.IsPastor(actor))
            return;

        var actorScope = await scope.GetActorScopeNodeIdAsync(actor, authUserId, ct);
        if (actorScope is null)
            throw new ForbiddenException("You do not have scope for this node");

        if (!await scope.IsNodeInSubtreeAsync(actor.StructureChurchId, actorScope.Value, node.Id, ct)
            && !await scope.IsNodeInSubtreeAsync(actor.StructureChurchId, node.Id, actorScope.Value, ct))
        {
            throw new ForbiddenException("Scope node is outside your assignment");
        }
    }

    private async Task<HashSet<Guid>> LoadParentIdsWithChildrenAsync(Guid churchId, CancellationToken ct) =>
        (await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId != null)
            .Select(p => p.ParentProgramId!.Value)
            .Distinct()
            .ToListAsync(ct))
        .ToHashSet();

    private static List<Guid> CollectDescendantIds(
        Guid rootId,
        IReadOnlyDictionary<Guid, List<Guid>> childrenByParent)
    {
        var result = new List<Guid>();
        var queue = new Queue<Guid>();
        queue.Enqueue(rootId);

        while (queue.Count > 0)
        {
            var id = queue.Dequeue();
            if (!childrenByParent.TryGetValue(id, out var children))
                continue;

            foreach (var childId in children)
            {
                result.Add(childId);
                queue.Enqueue(childId);
            }
        }

        return result;
    }

    private static GivingProgramDto ToDto(GivingProgram program, IReadOnlySet<Guid> parentIdsWithChildren)
    {
        var hasChildren = parentIdsWithChildren.Contains(program.Id);
        return new GivingProgramDto(
            program.Id,
            program.ParentProgramId,
            program.GivingType.ToString(),
            program.Title,
            program.PeriodLabel,
            program.ScopeKind.ToString(),
            program.ScopeNodeId,
            program.Status.ToString(),
            program.CreatedAt,
            hasChildren,
            AcceptsContributions: !hasChildren);
    }

    private static GivingType ParseGivingType(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new BadRequestException("GivingType is required");
        if (!Enum.TryParse<GivingType>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException($"Unknown giving type: {value}");
        return parsed;
    }

    private static ProgramScopeKind ParseScopeKind(string value)
    {
        if (!Enum.TryParse<ProgramScopeKind>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException($"Unknown scope kind: {value}");
        return parsed;
    }

    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }
}
