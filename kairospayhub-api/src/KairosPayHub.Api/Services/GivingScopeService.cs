using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class GivingScopeService(KairosDbContext db)
{
    public async Task<List<Guid>> CollectSubtreeNodeIdsAsync(
        Guid churchId,
        Guid rootId,
        CancellationToken ct = default)
    {
        var links = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId)
            .Select(n => new { n.Id, n.ParentNodeId })
            .ToListAsync(ct);

        var ids = new List<Guid> { rootId };
        var queue = new Queue<Guid>();
        queue.Enqueue(rootId);

        while (queue.Count > 0)
        {
            var parentId = queue.Dequeue();
            foreach (var child in links.Where(l => l.ParentNodeId == parentId))
            {
                ids.Add(child.Id);
                queue.Enqueue(child.Id);
            }
        }

        return ids;
    }

    public async Task<bool> IsNodeInSubtreeAsync(
        Guid churchId,
        Guid ancestorNodeId,
        Guid nodeId,
        CancellationToken ct = default)
    {
        if (ancestorNodeId == nodeId) return true;
        var subtree = await CollectSubtreeNodeIdsAsync(churchId, ancestorNodeId, ct);
        return subtree.Contains(nodeId);
    }

    public async Task<HashSet<Guid>> GetProgramScopeNodeIdsAsync(
        GivingProgram program,
        CancellationToken ct = default)
    {
        if (program.ScopeKind == ProgramScopeKind.ChurchWide)
            return [];

        if (program.ScopeKind == ProgramScopeKind.FellowshipGroup)
        {
            var scopeRows = await db.GivingProgramScopeNodes.AsNoTracking()
                .Where(s => s.ProgramId == program.Id)
                .Select(s => s.StructureNodeId)
                .ToListAsync(ct);
            var ids = new HashSet<Guid>();
            foreach (var nodeId in scopeRows)
            {
                foreach (var id in await CollectSubtreeNodeIdsAsync(program.ChurchId, nodeId, ct))
                    ids.Add(id);
            }
            return ids;
        }

        if (program.ScopeNodeId is null)
            return [];

        var subtree = await CollectSubtreeNodeIdsAsync(program.ChurchId, program.ScopeNodeId.Value, ct);
        return subtree.ToHashSet();
    }

    public async Task ValidateChildScopeWithinParentAsync(
        Guid churchId,
        GivingProgram parent,
        ProgramScopeKind childKind,
        Guid? childScopeNodeId,
        IReadOnlyList<Guid>? childScopeNodeIds,
        CancellationToken ct = default)
    {
        if (childKind == ProgramScopeKind.ChurchWide)
        {
            if (parent.ScopeKind != ProgramScopeKind.ChurchWide)
                throw new BadRequestException("Child scope cannot be wider than the parent program scope");
            return;
        }

        if (parent.ScopeKind == ProgramScopeKind.ChurchWide)
        {
            await ValidateScopeNodesExistAsync(churchId, childKind, childScopeNodeId, childScopeNodeIds, ct);
            return;
        }

        var parentScopeIds = await GetProgramScopeNodeIdsAsync(parent, ct);
        var childRootIds = ResolveScopeRootNodeIds(childKind, childScopeNodeId, childScopeNodeIds);
        await ValidateScopeNodesExistAsync(churchId, childKind, childScopeNodeId, childScopeNodeIds, ct);

        foreach (var rootId in childRootIds)
        {
            if (!parentScopeIds.Contains(rootId))
                throw new BadRequestException("Child scope must be within parent scope");
        }
    }

    public async Task<List<Guid>> CollectDescendantProgramIdsIncludingSelfAsync(
        Guid churchId,
        Guid programId,
        CancellationToken ct = default)
    {
        var links = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId)
            .Select(p => new { p.Id, p.ParentProgramId })
            .ToListAsync(ct);

        var childrenByParent = links
            .Where(l => l.ParentProgramId != null)
            .GroupBy(l => l.ParentProgramId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

        var result = new List<Guid> { programId };
        var queue = new Queue<Guid>();
        queue.Enqueue(programId);

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

    private static IReadOnlyList<Guid> ResolveScopeRootNodeIds(
        ProgramScopeKind scopeKind,
        Guid? scopeNodeId,
        IReadOnlyList<Guid>? scopeNodeIds)
    {
        if (scopeKind == ProgramScopeKind.FellowshipGroup)
            return scopeNodeIds?.Distinct().ToList() ?? [];

        if (scopeNodeId is null)
            throw new BadRequestException("ScopeNodeId is required for scoped programs");

        return [scopeNodeId.Value];
    }

    private async Task ValidateScopeNodesExistAsync(
        Guid churchId,
        ProgramScopeKind scopeKind,
        Guid? scopeNodeId,
        IReadOnlyList<Guid>? scopeNodeIds,
        CancellationToken ct)
    {
        foreach (var nodeId in ResolveScopeRootNodeIds(scopeKind, scopeNodeId, scopeNodeIds))
        {
            var exists = await db.StructureNodes.AsNoTracking()
                .AnyAsync(n => n.Id == nodeId && n.ChurchId == churchId, ct);
            if (!exists)
                throw new BadRequestException("Scope node not found");
        }
    }

    public async Task<bool> MemberInProgramScopeAsync(
        GivingProgram program,
        Guid memberParentNodeId,
        CancellationToken ct = default)
    {
        if (program.ScopeKind == ProgramScopeKind.ChurchWide)
            return true;

        var scopeIds = await GetProgramScopeNodeIdsAsync(program, ct);
        return scopeIds.Contains(memberParentNodeId);
    }

    public async Task<Guid?> GetActorScopeNodeIdAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct)
    {
        if (actor.StructureRole is null or ChurchRole.Pastor or ChurchRole.Member)
            return null;

        return await db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == actor.StructureChurchId && r.AuthUserId == authUserId)
            .Select(r => r.ScopeNodeId)
            .FirstOrDefaultAsync(ct);
    }

    public bool IsPastor(Actor actor) =>
        actor.StructureRole == ChurchRole.Pastor || actor.Role == Role.Pastor;

    public async Task<bool> CanEnterContributionAsync(
        Actor actor,
        Guid authUserId,
        GivingProgram program,
        Member member,
        CancellationToken ct)
    {
        if (program.Status != ProgramStatus.Open)
            return false;
        if (program.ChurchId != actor.StructureChurchId)
            return false;
        if (IsPastor(actor))
            return false;

        if (!await MemberInProgramScopeAsync(program, member.ParentNodeId, ct))
            return false;

        if (actor.StructureRole == ChurchRole.CellLeader)
        {
            var scopeNodeId = await GetActorScopeNodeIdAsync(actor, authUserId, ct);
            if (scopeNodeId is null) return false;
            return await IsNodeInSubtreeAsync(program.ChurchId, scopeNodeId.Value, member.ParentNodeId, ct);
        }

        return false;
    }

    public async Task<bool> CanApproveContributionAsync(
        Actor actor,
        Guid authUserId,
        GivingProgram program,
        Contribution contribution,
        CancellationToken ct)
    {
        if (program.ChurchId != actor.StructureChurchId)
            return false;
        if (IsPastor(actor))
            return true;

        if (actor.StructureRole != ChurchRole.FellowshipLeader)
            return false;

        var scopeNodeId = await GetActorScopeNodeIdAsync(actor, authUserId, ct);
        if (scopeNodeId is null) return false;

        return await IsNodeInSubtreeAsync(
            program.ChurchId,
            scopeNodeId.Value,
            contribution.MemberParentNodeId,
            ct);
    }

    public async Task<bool> CanViewMemberContributionsAsync(
        Actor actor,
        Guid authUserId,
        Member member,
        CancellationToken ct)
    {
        if (member.ChurchId != actor.StructureChurchId)
            return false;
        if (IsPastor(actor))
            return true;

        if (member.AuthUserId == authUserId)
            return true;

        var scopeNodeId = await GetActorScopeNodeIdAsync(actor, authUserId, ct);
        if (scopeNodeId is null) return false;

        return await IsNodeInSubtreeAsync(
            member.ChurchId,
            scopeNodeId.Value,
            member.ParentNodeId,
            ct);
    }
}
