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
    Guid? ParentProgramId = null,
    bool MoveParentContributions = false);

public class GivingProgramService(KairosDbContext db, GivingScopeService scope, NotificationService notifications)
{
    public async Task<IReadOnlyList<GivingProgramDto>> ListAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        var programs = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId == null)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        if (!scope.CanManageChurch(actor))
        {
            var allPrograms = await db.GivingPrograms.AsNoTracking()
                .Where(p => p.ChurchId == churchId)
                .ToListAsync(ct);
            var programsById = allPrograms.ToDictionary(p => p.Id);
            var childrenByParent = allPrograms
                .Where(p => p.ParentProgramId != null)
                .GroupBy(p => p.ParentProgramId!.Value)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

            var filtered = new List<GivingProgram>();
            foreach (var program in programs)
            {
                if (await scope.RootProgramVisibleToActorAsync(
                    program,
                    childrenByParent,
                    programsById,
                    actor,
                    authUserId,
                    ct))
                {
                    filtered.Add(program);
                }
            }

            programs = filtered;
        }

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return await MapProgramsToDtosAsync(actor, authUserId, churchId, programs, parentIdsWithChildren, ct);
    }

    public async Task<IReadOnlyList<GivingProgramDto>> ListChildrenAsync(
        Actor actor,
        Guid authUserId,
        Guid parentProgramId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        _ = await db.GivingPrograms.AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == parentProgramId && p.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Program not found");

        if (!scope.CanManageChurch(actor)
            && !await scope.CanAccessProgramByIdAsync(churchId, parentProgramId, actor, authUserId, ct))
        {
            throw new ForbiddenException("Program not found");
        }

        var programs = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId == parentProgramId)
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.CreatedAt)
            .ToListAsync(ct);

        if (!scope.CanManageChurch(actor))
        {
            var filtered = new List<GivingProgram>();
            foreach (var program in programs)
            {
                if (await scope.ProgramVisibleToActorAsync(program, actor, authUserId, ct))
                    filtered.Add(program);
            }

            programs = filtered;
        }

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return await MapProgramsToDtosAsync(actor, authUserId, churchId, programs, parentIdsWithChildren, ct);
    }

    public async Task<GivingProgramDto> GetAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var program = await db.GivingPrograms.AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == programId && p.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Program not found");

        if (!scope.CanManageChurch(actor)
            && !await scope.CanAccessProgramByIdAsync(churchId, programId, actor, authUserId, ct))
        {
            throw new ForbiddenException("Program not found");
        }

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return await MapProgramToDtoAsync(actor, authUserId, churchId, program, parentIdsWithChildren, ct);
    }

    public async Task<GivingDashboardDto> GetDashboardAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        if (scope.CanManageChurch(actor))
            return await GetPastorDashboardAsync(churchId, ct);

        if (actor.StructureRole is ChurchRole.PFCCManager or ChurchRole.FellowshipLeader)
            return await GetScopedLeaderDashboardAsync(actor, authUserId, churchId, ct);

        if (actor.StructureRole == ChurchRole.CellLeader)
            return await GetCellLeaderDashboardAsync(actor, authUserId, churchId, ct);

        throw new ForbiddenException("Dashboard is not available for your role");
    }

    private async Task<GivingDashboardDto> GetPastorDashboardAsync(
        Guid churchId,
        CancellationToken ct)
    {
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

        var pendingApprovalCount = await CountPendingContributionsForPastorAsync(churchId, allProgramIds, ct);
        var totalApproved = campaigns.Sum(c => c.TotalApprovedAmount);

        return new GivingDashboardDto(
            campaigns.Count,
            campaigns,
            PendingApprovalCount: pendingApprovalCount,
            ScopedApprovedTotal: totalApproved);
    }

    private async Task<GivingDashboardDto> GetScopedLeaderDashboardAsync(
        Actor actor,
        Guid authUserId,
        Guid churchId,
        CancellationToken ct)
    {
        var scopeNodeId = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == churchId
                && r.AuthUserId == authUserId
                && r.Role == actor.StructureRole)
            .Select(r => r.ScopeNodeId)
            .FirstOrDefaultAsync(ct)
            ?? throw new ForbiddenException("You do not have a scope assignment");

        var scopeUnitName = await db.StructureNodes.AsNoTracking()
            .Where(n => n.Id == scopeNodeId && n.ChurchId == churchId)
            .Select(n => n.Name)
            .SingleAsync(ct);

        var subtreeIds = await scope.CollectSubtreeNodeIdsAsync(churchId, scopeNodeId, ct);
        var subtreeSet = subtreeIds.ToHashSet();

        var layerTypes = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && subtreeSet.Contains(n.Id))
            .Join(
                db.StructureLayers.AsNoTracking(),
                n => n.LayerId,
                l => l.Id,
                (_, layer) => layer.StandardType)
            .ToListAsync(ct);

        var fellowshipCount = layerTypes.Count(t => t == StructureLayerType.Fellowship);
        var cellCount = layerTypes.Count(t => t == StructureLayerType.Cell);

        var memberCount = await db.ChurchMembers.AsNoTracking()
            .CountAsync(m => m.ChurchId == churchId && subtreeSet.Contains(m.ParentNodeId), ct);

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

        var openProgramIds = roots.Select(r => r.Id).ToList();
        foreach (var root in roots)
            openProgramIds.AddRange(CollectDescendantIds(root.Id, childrenByParent));

        var pendingApprovalCount = await CountPendingContributionsForScopedLeaderAsync(
            actor,
            churchId,
            openProgramIds,
            subtreeSet,
            ct);

        var scopedApprovedByProgram = await db.Contributions.AsNoTracking()
            .Where(c =>
                openProgramIds.Contains(c.ProgramId)
                && c.Status == ContributionStatus.Approved
                && subtreeSet.Contains(c.MemberParentNodeId))
            .GroupBy(c => c.ProgramId)
            .Select(g => new { ProgramId = g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.ProgramId, x => x.Total, ct);

        var campaigns = roots.Select(root =>
        {
            var descendantIds = CollectDescendantIds(root.Id, childrenByParent);
            var programIds = new List<Guid> { root.Id };
            programIds.AddRange(descendantIds);
            var total = programIds.Sum(id => scopedApprovedByProgram.GetValueOrDefault(id));
            return new GivingDashboardCampaignDto(
                root.Id,
                root.GivingType.ToString(),
                root.Title,
                root.PeriodLabel,
                total,
                descendantIds.Count);
        }).ToList();

        var allPrograms = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId)
            .ToListAsync(ct);
        var programsById = allPrograms.ToDictionary(p => p.Id);
        var filteredCampaigns = new List<GivingDashboardCampaignDto>();
        foreach (var campaign in campaigns)
        {
            if (!programsById.TryGetValue(campaign.Id, out var rootProgram))
                continue;

            if (await scope.RootProgramVisibleToActorAsync(
                rootProgram,
                childrenByParent,
                programsById,
                actor,
                authUserId,
                ct))
            {
                filteredCampaigns.Add(campaign);
            }
        }

        var scopedApprovedTotal = scopedApprovedByProgram.Values.Sum();

        return new GivingDashboardDto(
            filteredCampaigns.Count,
            filteredCampaigns,
            scopeUnitName,
            fellowshipCount,
            cellCount,
            memberCount,
            pendingApprovalCount,
            scopedApprovedTotal);
    }

    private async Task<GivingDashboardDto> GetCellLeaderDashboardAsync(
        Actor actor,
        Guid authUserId,
        Guid churchId,
        CancellationToken ct)
    {
        var cellScopeNodeIds = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == churchId
                && r.AuthUserId == authUserId
                && r.Role == ChurchRole.CellLeader
                && r.ScopeNodeId != null)
            .Select(r => r.ScopeNodeId!.Value)
            .Distinct()
            .ToListAsync(ct);

        if (cellScopeNodeIds.Count == 0)
            throw new ForbiddenException("You do not have a cell assignment");

        var subtreeSet = new HashSet<Guid>();
        foreach (var cellScopeNodeId in cellScopeNodeIds)
        {
            var subtreeIds = await scope.CollectSubtreeNodeIdsAsync(churchId, cellScopeNodeId, ct);
            foreach (var id in subtreeIds)
                subtreeSet.Add(id);
        }

        var scopeNames = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && cellScopeNodeIds.Contains(n.Id))
            .OrderBy(n => n.Name)
            .Select(n => n.Name)
            .ToListAsync(ct);

        var scopeUnitName = scopeNames.Count switch
        {
            0 => "Your cell",
            1 => scopeNames[0],
            _ => $"{scopeNames.Count} cells",
        };

        var memberCount = await db.ChurchMembers.AsNoTracking()
            .CountAsync(m => m.ChurchId == churchId && subtreeSet.Contains(m.ParentNodeId), ct);

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

        var openProgramIds = roots.Select(r => r.Id).ToList();
        foreach (var root in roots)
            openProgramIds.AddRange(CollectDescendantIds(root.Id, childrenByParent));

        var scopedApprovedByProgram = await db.Contributions.AsNoTracking()
            .Where(c =>
                openProgramIds.Contains(c.ProgramId)
                && c.Status == ContributionStatus.Approved
                && subtreeSet.Contains(c.MemberParentNodeId))
            .GroupBy(c => c.ProgramId)
            .Select(g => new { ProgramId = g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.ProgramId, x => x.Total, ct);

        var campaigns = roots.Select(root =>
        {
            var descendantIds = CollectDescendantIds(root.Id, childrenByParent);
            var programIds = new List<Guid> { root.Id };
            programIds.AddRange(descendantIds);
            var total = programIds.Sum(id => scopedApprovedByProgram.GetValueOrDefault(id));
            return new GivingDashboardCampaignDto(
                root.Id,
                root.GivingType.ToString(),
                root.Title,
                root.PeriodLabel,
                total,
                descendantIds.Count);
        }).ToList();

        var allPrograms = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId)
            .ToListAsync(ct);
        var programsById = allPrograms.ToDictionary(p => p.Id);
        var filteredCampaigns = new List<GivingDashboardCampaignDto>();
        foreach (var campaign in campaigns)
        {
            if (!programsById.TryGetValue(campaign.Id, out var rootProgram))
                continue;

            if (await scope.RootProgramVisibleToActorAsync(
                rootProgram,
                childrenByParent,
                programsById,
                actor,
                authUserId,
                ct))
            {
                filteredCampaigns.Add(campaign);
            }
        }

        var scopedApprovedTotal = scopedApprovedByProgram.Values.Sum();

        return new GivingDashboardDto(
            filteredCampaigns.Count,
            filteredCampaigns,
            scopeUnitName,
            FellowshipCount: 0,
            CellCount: cellScopeNodeIds.Count,
            memberCount,
            PendingApprovalCount: 0,
            scopedApprovedTotal);
    }

    private async Task<int> CountPendingContributionsForPastorAsync(
        Guid churchId,
        IReadOnlyList<Guid> programIds,
        CancellationToken ct)
    {
        if (programIds.Count == 0)
            return 0;

        var hasPfccManagers = await scope.ChurchHasPfccManagersAsync(churchId, ct);
        var pending = await db.Contributions.AsNoTracking()
            .Where(c => programIds.Contains(c.ProgramId) && c.Status == ContributionStatus.PendingApproval)
            .Select(c => c.EnteredByRole)
            .ToListAsync(ct);

        return pending.Count(enteredBy =>
            enteredBy == ChurchRole.PFCCManager
            || (!hasPfccManagers && enteredBy == ChurchRole.FellowshipLeader));
    }

    private async Task<int> CountPendingContributionsForScopedLeaderAsync(
        Actor actor,
        Guid churchId,
        IReadOnlyList<Guid> programIds,
        HashSet<Guid> subtreeMemberNodeIds,
        CancellationToken ct)
    {
        if (programIds.Count == 0)
            return 0;

        var hasPfccManagers = await scope.ChurchHasPfccManagersAsync(churchId, ct);
        var pending = await db.Contributions.AsNoTracking()
            .Where(c =>
                programIds.Contains(c.ProgramId)
                && c.Status == ContributionStatus.PendingApproval
                && subtreeMemberNodeIds.Contains(c.MemberParentNodeId))
            .Select(c => c.EnteredByRole)
            .ToListAsync(ct);

        return actor.StructureRole switch
        {
            ChurchRole.PFCCManager => pending.Count(r => r == ChurchRole.FellowshipLeader),
            ChurchRole.FellowshipLeader => pending.Count(r => r is null or ChurchRole.CellLeader),
            _ => 0,
        };
    }

    private async Task<int> CountPendingContributionsAsync(
        IReadOnlyList<Guid> programIds,
        CancellationToken ct)
    {
        if (programIds.Count == 0) return 0;

        return await db.Contributions.AsNoTracking()
            .CountAsync(
                c => programIds.Contains(c.ProgramId) && c.Status == ContributionStatus.PendingApproval,
                ct);
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
            if (scope.CanManageChurch(actor))
            {
                await scope.ValidateChildScopeWithinParentAsync(
                    churchId,
                    parent,
                    scopeKind,
                    input.ScopeNodeId,
                    input.ScopeNodeIds,
                    ct);
            }
            else if (actor.StructureRole == ChurchRole.PFCCManager)
            {
                await ValidateCreatePermissionAsync(actor, createdByAuthUserId, scopeKind, input, ct);
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
                throw new ForbiddenException("Only pastors and PFCC managers can create sub-givings");
            }
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
            ApprovalStatus = scope.CanManageChurch(actor)
                ? ProgramApprovalStatus.Approved
                : ProgramApprovalStatus.PendingPastorApproval,
            CreatedByRole = actor.StructureRole,
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

        if (parent is not null && input.MoveParentContributions)
        {
            await db.Contributions
                .Where(c => c.ProgramId == parent.Id)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(c => c.ProgramId, program.Id),
                    ct);
        }

        if (program.ParentProgramId is not null
            && program.ApprovalStatus == ProgramApprovalStatus.PendingPastorApproval)
        {
            await notifications.NotifySubGivingPendingAsync(program, ct);
        }

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return await MapProgramToDtoAsync(actor, createdByAuthUserId, churchId, program, parentIdsWithChildren, ct);
    }

    public async Task<GivingProgramDto> ApproveSubGivingAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        CancellationToken ct = default)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only a pastor can approve sub-givings");

        var churchId = RequireStructureChurch(actor);
        var program = await db.GivingPrograms.SingleOrDefaultAsync(
            p => p.Id == programId && p.ChurchId == churchId,
            ct)
            ?? throw new ForbiddenException("Program not found");

        if (program.ParentProgramId is null)
            throw new BadRequestException("Only sub-givings can be approved through this action");

        if (program.ApprovalStatus != ProgramApprovalStatus.PendingPastorApproval)
            throw new BadRequestException("Sub-giving is not pending approval");

        program.ApprovalStatus = ProgramApprovalStatus.Approved;
        program.ReviewedByAuthUserId = authUserId;
        program.ReviewedAt = DateTimeOffset.UtcNow;
        program.RejectionReason = null;
        await db.SaveChangesAsync(ct);

        await notifications.NotifySubGivingReviewedAsync(program, approved: true, ct);

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return await MapProgramToDtoAsync(actor, authUserId, churchId, program, parentIdsWithChildren, ct);
    }

    public async Task<GivingProgramDto> RejectSubGivingAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        string? reason,
        CancellationToken ct = default)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only a pastor can reject sub-givings");

        var churchId = RequireStructureChurch(actor);
        var program = await db.GivingPrograms.SingleOrDefaultAsync(
            p => p.Id == programId && p.ChurchId == churchId,
            ct)
            ?? throw new ForbiddenException("Program not found");

        if (program.ParentProgramId is null)
            throw new BadRequestException("Only sub-givings can be rejected through this action");

        if (program.ApprovalStatus != ProgramApprovalStatus.PendingPastorApproval)
            throw new BadRequestException("Sub-giving is not pending approval");

        program.ApprovalStatus = ProgramApprovalStatus.Rejected;
        program.ReviewedByAuthUserId = authUserId;
        program.ReviewedAt = DateTimeOffset.UtcNow;
        program.RejectionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        await db.SaveChangesAsync(ct);

        await notifications.NotifySubGivingReviewedAsync(program, approved: false, ct);

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return await MapProgramToDtoAsync(actor, authUserId, churchId, program, parentIdsWithChildren, ct);
    }

    public async Task<GivingProgramDto> CloseProgramAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        CancellationToken ct = default)
    {
        var program = await RequireRootProgramForPastorAsync(actor, programId, ct);
        if (program.Status == ProgramStatus.Closed)
            throw new BadRequestException("Campaign is already closed");

        var treeIds = await CollectProgramTreeIdsAsync(program.ChurchId, program.Id, ct);
        await db.GivingPrograms
            .Where(p => treeIds.Contains(p.Id))
            .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.Status, ProgramStatus.Closed), ct);

        program.Status = ProgramStatus.Closed;
        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(program.ChurchId, ct);
        return await MapProgramToDtoAsync(actor, authUserId, program.ChurchId, program, parentIdsWithChildren, ct);
    }

    public async Task<GivingProgramDto> ReopenProgramAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        CancellationToken ct = default)
    {
        var program = await RequireRootProgramForPastorAsync(actor, programId, ct);
        if (program.Status == ProgramStatus.Open)
            throw new BadRequestException("Campaign is already open");

        var treeIds = await CollectProgramTreeIdsAsync(program.ChurchId, program.Id, ct);
        await db.GivingPrograms
            .Where(p => treeIds.Contains(p.Id))
            .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.Status, ProgramStatus.Open), ct);

        program.Status = ProgramStatus.Open;
        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(program.ChurchId, ct);
        return await MapProgramToDtoAsync(actor, authUserId, program.ChurchId, program, parentIdsWithChildren, ct);
    }

    public async Task DeleteProgramAsync(
        Actor actor,
        Guid programId,
        CancellationToken ct = default)
    {
        var program = await RequireRootProgramForPastorAsync(actor, programId, ct);
        var treeIds = await CollectProgramTreeIdsAsync(program.ChurchId, program.Id, ct);

        var hasContributions = await db.Contributions.AsNoTracking()
            .AnyAsync(c => treeIds.Contains(c.ProgramId), ct);
        if (hasContributions)
        {
            throw new BadRequestException(
                "Cannot delete a campaign that has contributions. Close it instead.");
        }

        var programs = await db.GivingPrograms
            .Where(p => treeIds.Contains(p.Id))
            .ToListAsync(ct);

        while (programs.Count > 0)
        {
            var leaves = programs
                .Where(p => !programs.Any(child => child.ParentProgramId == p.Id))
                .ToList();
            if (leaves.Count == 0)
                throw new InvalidOperationException("Could not resolve campaign delete order");

            db.GivingPrograms.RemoveRange(leaves);
            await db.SaveChangesAsync(ct);
            programs.RemoveAll(p => leaves.Contains(p));
        }
    }

    private async Task<GivingProgram> RequireRootProgramForPastorAsync(
        Actor actor,
        Guid programId,
        CancellationToken ct)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only a pastor can manage campaigns");

        var churchId = RequireStructureChurch(actor);
        var program = await db.GivingPrograms.SingleOrDefaultAsync(
            p => p.Id == programId && p.ChurchId == churchId,
            ct)
            ?? throw new ForbiddenException("Program not found");

        if (program.ParentProgramId is not null)
            throw new BadRequestException("Use campaign actions on the parent giving, not a sub-giving");

        return program;
    }

    private async Task<IReadOnlyList<Guid>> CollectProgramTreeIdsAsync(
        Guid churchId,
        Guid rootProgramId,
        CancellationToken ct)
    {
        var links = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId != null)
            .Select(p => new { p.Id, p.ParentProgramId })
            .ToListAsync(ct);

        var childrenByParent = links
            .GroupBy(l => l.ParentProgramId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

        var ids = new List<Guid> { rootProgramId };
        ids.AddRange(CollectDescendantIds(rootProgramId, childrenByParent));
        return ids;
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
            if (!scope.CanManageChurch(actor))
                throw new ForbiddenException("Only a pastor can create church-wide giving programs");
            return;
        }

        if (scopeKind == ProgramScopeKind.Fellowship)
        {
            if (!await scope.HasRoleAsync(actor, authUserId, ChurchRole.PFCCManager, ct)
                && !scope.CanManageChurch(actor))
            {
                throw new ForbiddenException(
                    "Only a pastor or PFCC manager can create fellowship-scoped programs");
            }
            await ValidateScopeNodeAsync(actor, authUserId, input.ScopeNodeId, ct);
            return;
        }

        if (scopeKind == ProgramScopeKind.PFCC)
        {
            if (!await scope.HasRoleAsync(actor, authUserId, ChurchRole.PFCCManager, ct)
                && !scope.CanManageChurch(actor))
            {
                throw new ForbiddenException("Only a PFCC manager can create PFCC-scoped programs");
            }
            await ValidateScopeNodeAsync(actor, authUserId, input.ScopeNodeId, ct);
            return;
        }

        if (scopeKind == ProgramScopeKind.FellowshipGroup)
        {
            if (!await scope.HasRoleAsync(actor, authUserId, ChurchRole.PFCCManager, ct)
                && !scope.CanManageChurch(actor))
            {
                throw new ForbiddenException("Only a pastor or PFCC manager can create grouped fellowship programs");
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

        if (scope.CanManageChurch(actor))
            return;

        if (!await scope.IsNodeAccessibleViaAssignmentsAsync(
            actor.StructureChurchId,
            authUserId,
            node.Id,
            ct))
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

    private async Task<IReadOnlyList<GivingProgramDto>> MapProgramsToDtosAsync(
        Actor actor,
        Guid authUserId,
        Guid churchId,
        IReadOnlyList<GivingProgram> programs,
        IReadOnlySet<Guid> parentIdsWithChildren,
        CancellationToken ct)
    {
        if (programs.Count == 0)
            return [];

        var creators = await GivingProgramCreatorResolver.ResolveForProgramsAsync(
            db,
            churchId,
            programs.Select(p => (p.CreatedByAuthUserId, p.CreatedByRole)),
            ct);

        var totals = await LoadDisplayTotalsAsync(actor, authUserId, churchId, programs, ct);
        var directStats = await LoadDirectContributionStatsAsync(
            programs.Select(p => p.Id).ToList(),
            ct);

        return programs
            .Select(p => ToDto(
                p,
                parentIdsWithChildren,
                creators.TryGetValue(p.CreatedByAuthUserId, out var creator)
                    ? creator
                    : new ProgramCreatorDisplay(null, null),
                totals.GetValueOrDefault(p.Id),
                directStats.GetValueOrDefault(p.Id)))
            .ToList();
    }

    private async Task<IReadOnlyDictionary<Guid, DirectContributionStats>> LoadDirectContributionStatsAsync(
        IReadOnlyList<Guid> programIds,
        CancellationToken ct)
    {
        if (programIds.Count == 0)
            return new Dictionary<Guid, DirectContributionStats>();

        return await db.Contributions.AsNoTracking()
            .Where(c => programIds.Contains(c.ProgramId))
            .GroupBy(c => c.ProgramId)
            .Select(g => new
            {
                ProgramId = g.Key,
                Count = g.Count(),
                Total = g.Sum(x => x.Amount),
            })
            .ToDictionaryAsync(
                x => x.ProgramId,
                x => new DirectContributionStats(x.Count, x.Total),
                ct);
    }

    private sealed record DirectContributionStats(int Count, decimal Total);

    private async Task<GivingProgramDto> MapProgramToDtoAsync(
        Actor actor,
        Guid authUserId,
        Guid churchId,
        GivingProgram program,
        IReadOnlySet<Guid> parentIdsWithChildren,
        CancellationToken ct)
    {
        var dtos = await MapProgramsToDtosAsync(
            actor,
            authUserId,
            churchId,
            [program],
            parentIdsWithChildren,
            ct);
        return dtos[0];
    }

    private async Task<IReadOnlyDictionary<Guid, decimal>> LoadDisplayTotalsAsync(
        Actor actor,
        Guid authUserId,
        Guid churchId,
        IReadOnlyList<GivingProgram> programs,
        CancellationToken ct)
    {
        if (programs.Count == 0)
            return new Dictionary<Guid, decimal>();

        var links = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId != null)
            .Select(p => new { p.Id, p.ParentProgramId })
            .ToListAsync(ct);

        var childrenByParent = links
            .GroupBy(l => l.ParentProgramId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

        var rollupProgramIds = new HashSet<Guid>();
        foreach (var program in programs)
        {
            rollupProgramIds.Add(program.Id);
            foreach (var descendantId in CollectDescendantIds(program.Id, childrenByParent))
                rollupProgramIds.Add(descendantId);
        }

        var approvedQuery = db.Contributions.AsNoTracking()
            .Where(c =>
                rollupProgramIds.Contains(c.ProgramId)
                && c.Status == ContributionStatus.Approved);

        Dictionary<Guid, decimal> approvedByProgram;
        if (scope.CanManageChurch(actor))
        {
            approvedByProgram = await approvedQuery
                .GroupBy(c => c.ProgramId)
                .Select(g => new { ProgramId = g.Key, Total = g.Sum(x => x.Amount) })
                .ToDictionaryAsync(x => x.ProgramId, x => x.Total, ct);
        }
        else
        {
            var subtreeSet = await scope.GetActorStructureSubtreeNodeIdsAsync(actor, authUserId, ct);
            approvedByProgram = await approvedQuery
                .Where(c => subtreeSet.Contains(c.MemberParentNodeId))
                .GroupBy(c => c.ProgramId)
                .Select(g => new { ProgramId = g.Key, Total = g.Sum(x => x.Amount) })
                .ToDictionaryAsync(x => x.ProgramId, x => x.Total, ct);
        }

        var totals = new Dictionary<Guid, decimal>();
        foreach (var program in programs)
        {
            var hasChildren = childrenByParent.ContainsKey(program.Id);
            var descendantIds = CollectDescendantIds(program.Id, childrenByParent);
            if (hasChildren)
            {
                totals[program.Id] = descendantIds.Sum(id => approvedByProgram.GetValueOrDefault(id));
            }
            else
            {
                totals[program.Id] = approvedByProgram.GetValueOrDefault(program.Id)
                    + descendantIds.Sum(id => approvedByProgram.GetValueOrDefault(id));
            }
        }

        return totals;
    }

    private static GivingProgramDto ToDto(
        GivingProgram program,
        IReadOnlySet<Guid> parentIdsWithChildren,
        ProgramCreatorDisplay creator,
        decimal totalApprovedAmount,
        DirectContributionStats? directStats)
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
            program.ApprovalStatus.ToString(),
            program.CreatedByRole?.ToString(),
            creator.Name,
            creator.ScopeUnitName,
            program.CreatedAt,
            totalApprovedAmount,
            hasChildren,
            AcceptsContributions: !hasChildren && program.ApprovalStatus == ProgramApprovalStatus.Approved,
            directStats?.Count ?? 0,
            directStats?.Total ?? 0m);
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
