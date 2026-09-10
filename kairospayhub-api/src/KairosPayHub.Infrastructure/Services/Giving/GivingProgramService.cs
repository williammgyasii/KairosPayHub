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
    bool MoveParentContributions = false,
    DateOnly? StartsOn = null,
    DateOnly? EndsOn = null,
    DateTimeOffset? GoLiveAt = null,
    string? CustomTypeLabel = null,
    DateOnly? EventDate = null,
    DateTimeOffset? LogOpensAt = null,
    bool SuppressOpenNotification = false,
    bool? ReceiveGivingsOnMain = null,
    CreateFirstSubCampaignRequest? FirstSubCampaign = null);

public class GivingProgramService(
    KairosDbContext db,
    GivingScopeService scope,
    NotificationService notifications,
    ChurchReadCache readCache)
{
    public async Task<IReadOnlyList<GivingProgramDto>> ListAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        await ActivateDueProgramsAsync(churchId, ct);

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
        await ActivateDueProgramsAsync(churchId, ct);

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
        await ActivateDueProgramsAsync(churchId, ct);

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
        await ActivateDueProgramsAsync(churchId, ct);

        var role = actor.StructureRole?.ToString() ?? actor.Role.ToString();
        var cacheKey = readCache.GivingDashboardKey(churchId, authUserId, role);
        return await readCache.GetOrCreateAsync(
            cacheKey,
            ChurchReadCache.GivingDashboardTtl,
            async innerCt =>
            {
                if (scope.CanManageChurch(actor))
                    return await GetPastorDashboardAsync(churchId, innerCt);

                if (actor.StructureRole is ChurchRole.PFCCManager or ChurchRole.FellowshipLeader)
                    return await GetScopedLeaderDashboardAsync(actor, authUserId, churchId, innerCt);

                if (actor.StructureRole == ChurchRole.CellLeader)
                    return await GetCellLeaderDashboardAsync(actor, authUserId, churchId, innerCt);

                throw new ForbiddenException("Dashboard is not available for your role");
            },
            ct);
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
        var periodLabel = string.IsNullOrWhiteSpace(input.PeriodLabel)
            ? input.EventDate?.ToString("yyyy-MM-dd")
              ?? CampaignScheduling.DerivePeriodLabel(input.StartsOn, input.EndsOn, null)
            : input.PeriodLabel.Trim();

        if (string.IsNullOrWhiteSpace(title))
            throw new BadRequestException("Title is required");

        if (input.StartsOn is not null && input.EndsOn is not null && input.EndsOn < input.StartsOn)
            throw new BadRequestException("End date must be on or after start date");

        if (input.GivingType.Equals("Other", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrWhiteSpace(input.CustomTypeLabel))
        {
            throw new BadRequestException("Custom type label is required when giving type is Other");
        }

        GivingProgram? parent = null;
        GivingType givingType;
        var (scopeKind, resolvedScopeNodeId, resolvedScopeNodeIds) = await scope.ResolveProgramScopeAsync(
            churchId,
            input.ScopeKind,
            input.ScopeNodeId,
            input.ScopeNodeIds,
            ct);

        if (input.ParentProgramId is not null)
        {
            parent = await db.GivingPrograms.AsNoTracking()
                .SingleOrDefaultAsync(
                    p => p.Id == input.ParentProgramId && p.ChurchId == churchId,
                    ct)
                ?? throw new BadRequestException("Parent program not found");

            givingType = parent.GivingType;
            if (!scope.CanCreateGivingPrograms(actor))
                throw new ForbiddenException("You cannot create sub-campaigns");

            await ValidateCreatePermissionAsync(
                actor,
                createdByAuthUserId,
                scopeKind,
                input with { ScopeNodeId = resolvedScopeNodeId, ScopeNodeIds = resolvedScopeNodeIds },
                ct);
            await scope.ValidateChildScopeWithinParentAsync(
                churchId,
                parent,
                scopeKind,
                resolvedScopeNodeId,
                resolvedScopeNodeIds,
                ct);
        }
        else
        {
            givingType = ParseGivingType(input.GivingType);
            if (!scope.CanCreateGivingPrograms(actor))
                throw new ForbiddenException("You cannot create campaigns");

            await ValidateCreatePermissionAsync(
                actor,
                createdByAuthUserId,
                scopeKind,
                input with { ScopeNodeId = resolvedScopeNodeId, ScopeNodeIds = resolvedScopeNodeIds },
                ct);

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

        if ((scopeKind is ProgramScopeKind.Fellowship or ProgramScopeKind.PFCC or ProgramScopeKind.Unit)
            && resolvedScopeNodeId is null)
            throw new BadRequestException("ScopeNodeId is required for scoped programs");

        if ((scopeKind is ProgramScopeKind.FellowshipGroup or ProgramScopeKind.UnitGroup)
            && (resolvedScopeNodeIds is null || resolvedScopeNodeIds.Count == 0))
            throw new BadRequestException("At least one scope unit must be selected");

        var sortOrder = 0;
        if (parent is not null)
        {
            sortOrder = await db.GivingPrograms
                .Where(p => p.ParentProgramId == parent.Id)
                .Select(p => (int?)p.SortOrder)
                .MaxAsync(ct) ?? -1;
            sortOrder += 1;
        }

        var receiveOnMain = input.ParentProgramId is null
            ? input.ReceiveGivingsOnMain ?? true
            : true;

        if (input.ParentProgramId is null && !receiveOnMain && input.FirstSubCampaign is null)
        {
            throw new BadRequestException(
                "When receive givings on main is off, create at least one sub-campaign.");
        }

        var now = DateTimeOffset.UtcNow;
        var goLiveAt = input.GoLiveAt;
        var initialStatus = ProgramStatus.Open;
        if (input.ParentProgramId is null && goLiveAt is not null && goLiveAt > now)
            initialStatus = ProgramStatus.Scheduled;

        var program = new GivingProgram
        {
            ChurchId = churchId,
            ParentProgramId = input.ParentProgramId,
            GivingType = givingType,
            CustomTypeLabel = string.IsNullOrWhiteSpace(input.CustomTypeLabel)
                ? null
                : input.CustomTypeLabel.Trim(),
            Title = title,
            PeriodLabel = periodLabel,
            StartsOn = input.StartsOn ?? input.EventDate,
            EndsOn = input.EndsOn ?? input.EventDate,
            GoLiveAt = input.ParentProgramId is null ? goLiveAt : null,
            EventDate = input.EventDate,
            LogOpensAt = input.LogOpensAt,
            ScopeKind = scopeKind,
            ScopeNodeId = resolvedScopeNodeId,
            Status = initialStatus,
            ReceiveGivingsOnMain = receiveOnMain,
            ApprovalStatus = scope.CanManageChurch(actor)
                ? ProgramApprovalStatus.Approved
                : ProgramApprovalStatus.PendingPastorApproval,
            CreatedByRole = actor.StructureRole,
            CreatedByAuthUserId = createdByAuthUserId,
            SortOrder = sortOrder,
            CreatedAt = now,
        };

        db.GivingPrograms.Add(program);

        if (scopeKind is ProgramScopeKind.FellowshipGroup or ProgramScopeKind.UnitGroup
            && resolvedScopeNodeIds is not null)
        {
            foreach (var nodeId in resolvedScopeNodeIds.Distinct())
            {
                db.GivingProgramScopeNodes.Add(new GivingProgramScopeNode
                {
                    ProgramId = program.Id,
                    StructureNodeId = nodeId,
                });
            }
        }

        await db.SaveChangesAsync(ct);
        readCache.InvalidateGivingDashboard(churchId);

        if (parent is null && input.FirstSubCampaign is not null)
        {
            await CreateAsync(
                actor,
                createdByAuthUserId,
                new CreateGivingProgramInput(
                    givingType.ToString(),
                    input.FirstSubCampaign.Title ?? string.Empty,
                    input.FirstSubCampaign.PeriodLabel ?? string.Empty,
                    input.FirstSubCampaign.ScopeKind ?? program.ScopeKind.ToString(),
                    input.FirstSubCampaign.ScopeNodeId ?? program.ScopeNodeId,
                    input.FirstSubCampaign.ScopeNodeIds,
                    program.Id,
                    MoveParentContributions: false,
                    EventDate: input.FirstSubCampaign.EventDate,
                    LogOpensAt: input.FirstSubCampaign.LogOpensAt,
                    StartsOn: input.FirstSubCampaign.EventDate,
                    EndsOn: input.FirstSubCampaign.EventDate,
                    SuppressOpenNotification: true),
                ct);
            // Reload hasChildren via MapProgramToDtoAsync
            program = await db.GivingPrograms.AsNoTracking()
                .SingleAsync(p => p.Id == program.Id, ct);
        }

        if (parent is not null && input.MoveParentContributions)
        {
            await db.Contributions
                .Where(c => c.ProgramId == parent.Id)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(c => c.ProgramId, program.Id),
                    ct);
            readCache.InvalidateGivingDashboard(churchId);
        }

        if (program.ParentProgramId is not null
            && program.ApprovalStatus == ProgramApprovalStatus.PendingPastorApproval)
        {
            await notifications.NotifySubGivingPendingAsync(program, ct);
        }
        else if (program.ApprovalStatus == ProgramApprovalStatus.Approved
            && !input.SuppressOpenNotification
            && initialStatus == ProgramStatus.Open)
        {
            await notifications.NotifyGivingCampaignOpenedAsync(program, createdByAuthUserId, ct);
            program.LeadersNotifiedAt = now;
            await db.SaveChangesAsync(ct);
            readCache.InvalidateGivingDashboard(churchId);
        }

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return await MapProgramToDtoAsync(actor, createdByAuthUserId, churchId, program, parentIdsWithChildren, ct);
    }

    public async Task<BatchSubCampaignPreviewDto> PreviewBatchSubCampaignsAsync(
        Actor actor,
        Guid authUserId,
        Guid parentProgramId,
        BatchSubCampaignRequest request,
        CancellationToken ct = default)
    {
        var parent = await RequireParentForBatchAsync(actor, authUserId, parentProgramId, request, ct);
        var dates = BuildBatchEventDates(parent, request).ToList();
        var samples = dates.Take(5).ToList();
        return new BatchSubCampaignPreviewDto(
            dates.Count,
            samples.Select(d => CampaignScheduling.BuildSubCampaignTitle(d, request.TitlePrefix)).ToList(),
            samples.Select(d => d.ToString("yyyy-MM-dd")).ToList());
    }

    public async Task<IReadOnlyList<GivingProgramDto>> CreateBatchSubCampaignsAsync(
        Actor actor,
        Guid createdByAuthUserId,
        Guid parentProgramId,
        BatchSubCampaignRequest request,
        CancellationToken ct = default)
    {
        var parent = await RequireParentForBatchAsync(actor, createdByAuthUserId, parentProgramId, request, ct);
        var dates = BuildBatchEventDates(parent, request).ToList();
        if (dates.Count == 0)
            throw new BadRequestException("No sub-campaign dates in the selected range");

        var (scopeKind, scopeNodeId, scopeNodeIds) = await scope.ResolveProgramScopeAsync(
            parent.ChurchId,
            request.ScopeKind,
            request.ScopeNodeId ?? (string.IsNullOrWhiteSpace(request.ScopeKind) ? parent.ScopeNodeId : null),
            request.ScopeNodeIds,
            ct);

        if (string.IsNullOrWhiteSpace(request.ScopeKind)
            && request.ScopeNodeId is null
            && (request.ScopeNodeIds is null || request.ScopeNodeIds.Count == 0))
        {
            scopeKind = parent.ScopeKind;
            scopeNodeId = parent.ScopeNodeId;
            if (parent.ScopeKind is ProgramScopeKind.FellowshipGroup or ProgramScopeKind.UnitGroup)
            {
                scopeNodeIds = await db.GivingProgramScopeNodes.AsNoTracking()
                    .Where(s => s.ProgramId == parent.Id)
                    .Select(s => s.StructureNodeId)
                    .ToListAsync(ct);
            }
        }

        await scope.ValidateChildScopeWithinParentAsync(
            parent.ChurchId,
            parent,
            scopeKind,
            scopeNodeId,
            scopeNodeIds,
            ct);

        if ((scopeKind is ProgramScopeKind.Fellowship or ProgramScopeKind.PFCC or ProgramScopeKind.Unit)
            && scopeNodeId is null)
            throw new BadRequestException("ScopeNodeId is required for scoped sub-campaigns");

        var sortOrder = await db.GivingPrograms
            .Where(p => p.ParentProgramId == parent.Id)
            .Select(p => (int?)p.SortOrder)
            .MaxAsync(ct) ?? -1;

        var now = DateTimeOffset.UtcNow;
        var created = new List<GivingProgram>();

        foreach (var eventDate in dates)
        {
            sortOrder += 1;
            var title = CampaignScheduling.BuildSubCampaignTitle(eventDate, request.TitlePrefix);
            var program = new GivingProgram
            {
                ChurchId = parent.ChurchId,
                ParentProgramId = parent.Id,
                GivingType = parent.GivingType,
                CustomTypeLabel = parent.CustomTypeLabel,
                Title = title,
                PeriodLabel = eventDate.ToString("yyyy-MM-dd"),
                StartsOn = eventDate,
                EndsOn = eventDate,
                EventDate = eventDate,
                LogOpensAt = CampaignScheduling.ComputeLogOpensAt(eventDate, request.LogOpensOffsetDays),
                ScopeKind = scopeKind,
                ScopeNodeId = scopeNodeId,
                Status = ProgramStatus.Open,
                ApprovalStatus = scope.CanManageChurch(actor)
                    ? ProgramApprovalStatus.Approved
                    : ProgramApprovalStatus.PendingPastorApproval,
                CreatedByRole = actor.StructureRole,
                CreatedByAuthUserId = createdByAuthUserId,
                SortOrder = sortOrder,
                CreatedAt = now,
            };
            db.GivingPrograms.Add(program);
            created.Add(program);

            if (scopeKind is ProgramScopeKind.FellowshipGroup or ProgramScopeKind.UnitGroup
                && scopeNodeIds is not null)
            {
                foreach (var nodeId in scopeNodeIds.Distinct())
                {
                    db.GivingProgramScopeNodes.Add(new GivingProgramScopeNode
                    {
                        ProgramId = program.Id,
                        StructureNodeId = nodeId,
                    });
                }
            }
        }

        await db.SaveChangesAsync(ct);
        readCache.InvalidateGivingDashboard(parent.ChurchId);

        if (created.Any(p => p.ApprovalStatus == ProgramApprovalStatus.PendingPastorApproval))
        {
            foreach (var program in created.Where(p => p.ApprovalStatus == ProgramApprovalStatus.PendingPastorApproval))
                await notifications.NotifySubGivingPendingAsync(program, ct);
        }

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(parent.ChurchId, ct);
        var dtos = new List<GivingProgramDto>();
        foreach (var program in created)
        {
            dtos.Add(await MapProgramToDtoAsync(
                actor,
                createdByAuthUserId,
                parent.ChurchId,
                program,
                parentIdsWithChildren,
                ct));
        }

        return dtos;
    }

    private async Task<GivingProgram> RequireParentForBatchAsync(
        Actor actor,
        Guid authUserId,
        Guid parentProgramId,
        BatchSubCampaignRequest request,
        CancellationToken ct)
    {
        if (!request.Frequency.Equals("Weekly", StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException("Only Weekly frequency is supported");

        if (request.DayOfWeek is < 0 or > 6)
            throw new BadRequestException("DayOfWeek must be 0 (Sunday) through 6 (Saturday)");

        if (request.RangeEnd < request.RangeStart)
            throw new BadRequestException("Range end must be on or after range start");

        var churchId = RequireStructureChurch(actor);
        var parent = await db.GivingPrograms.AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == parentProgramId && p.ChurchId == churchId, ct)
            ?? throw new BadRequestException("Parent program not found");

        if (parent.ParentProgramId is not null)
            throw new BadRequestException("Sub-campaigns can only be added to a main campaign");

        if (!scope.CanCreateGivingPrograms(actor))
            throw new ForbiddenException("You cannot create sub-campaigns");

        if (!scope.CanManageChurch(actor)
            && !await scope.CanAccessProgramByIdAsync(churchId, parentProgramId, actor, authUserId, ct))
        {
            throw new ForbiddenException("Program not found");
        }

        return parent;
    }

    private static IEnumerable<DateOnly> BuildBatchEventDates(
        GivingProgram parent,
        BatchSubCampaignRequest request)
    {
        var rangeStart = request.RangeStart;
        var rangeEnd = request.RangeEnd;

        if (parent.StartsOn is not null && rangeStart < parent.StartsOn)
            rangeStart = parent.StartsOn.Value;
        if (parent.EndsOn is not null && rangeEnd > parent.EndsOn)
            rangeEnd = parent.EndsOn.Value;

        var dates = CampaignScheduling
            .EnumerateWeeklyOccurrences((DayOfWeek)request.DayOfWeek, rangeStart, rangeEnd)
            .ToList();

        if (dates.Count > CampaignScheduling.MaxBatchSubCampaigns)
            throw new BadRequestException(
                $"Cannot create more than {CampaignScheduling.MaxBatchSubCampaigns} sub-campaigns at once");

        return dates;
    }

    private async Task ActivateDueProgramsAsync(Guid churchId, CancellationToken ct)
    {
        if (readCache.ShouldSkipScheduledActivation(churchId))
            return;

        var now = DateTimeOffset.UtcNow;
        var due = await db.GivingPrograms
            .Where(p => p.ChurchId == churchId
                && p.Status == ProgramStatus.Scheduled
                && p.GoLiveAt != null
                && p.GoLiveAt <= now
                && p.ApprovalStatus == ProgramApprovalStatus.Approved)
            .ToListAsync(ct);

        if (due.Count == 0)
        {
            readCache.MarkScheduledActivationChecked(churchId);
            return;
        }

        foreach (var program in due)
            program.Status = ProgramStatus.Open;

        await db.SaveChangesAsync(ct);
        readCache.InvalidateGivingDashboard(churchId);

        foreach (var program in due)
        {
            if (program.LeadersNotifiedAt is not null)
                continue;

            await notifications.NotifyGivingCampaignOpenedAsync(program, program.CreatedByAuthUserId, ct);
            program.LeadersNotifiedAt = now;
        }

        await db.SaveChangesAsync(ct);
        readCache.MarkScheduledActivationChecked(churchId);
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
        readCache.InvalidateGivingDashboard(churchId);

        await notifications.NotifySubGivingReviewedAsync(program, approved: true, ct);
        await notifications.NotifyGivingCampaignOpenedAsync(program, authUserId, ct);

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
        readCache.InvalidateGivingDashboard(churchId);

        await notifications.NotifySubGivingReviewedAsync(program, approved: false, ct);

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        return await MapProgramToDtoAsync(actor, authUserId, churchId, program, parentIdsWithChildren, ct);
    }

    public async Task<GivingProgramDto> UpdateSettingsAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        UpdateGivingProgramSettingsRequest request,
        CancellationToken ct = default)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can update campaign settings");

        var churchId = RequireStructureChurch(actor);
        var program = await db.GivingPrograms.SingleOrDefaultAsync(
            p => p.Id == programId && p.ChurchId == churchId,
            ct)
            ?? throw new ForbiddenException("Program not found");

        if (program.ParentProgramId is not null)
            throw new BadRequestException("Only main campaigns have this setting");

        if (request.ReceiveGivingsOnMain)
        {
            program.ReceiveGivingsOnMain = true;
            await db.SaveChangesAsync(ct);
            readCache.InvalidateGivingDashboard(churchId);
            var parentsOn = await LoadParentIdsWithChildrenAsync(churchId, ct);
            return await MapProgramToDtoAsync(actor, authUserId, churchId, program, parentsOn, ct);
        }

        var directCount = await db.Contributions.CountAsync(c => c.ProgramId == program.Id, ct);
        Guid? moveTargetId = request.MoveDirectToProgramId;

        if (directCount > 0)
        {
            if (moveTargetId is null && request.CreateSubThenMove is null)
            {
                throw new BadRequestException(
                    "Turn off receive-givings on main requires moving direct contributions to a sub-campaign.");
            }

            if (request.CreateSubThenMove is not null)
            {
                var createdSub = await CreateAsync(
                    actor,
                    authUserId,
                    new CreateGivingProgramInput(
                        program.GivingType.ToString(),
                        request.CreateSubThenMove.Title ?? string.Empty,
                        request.CreateSubThenMove.PeriodLabel ?? string.Empty,
                        request.CreateSubThenMove.ScopeKind ?? program.ScopeKind.ToString(),
                        request.CreateSubThenMove.ScopeNodeId ?? program.ScopeNodeId,
                        request.CreateSubThenMove.ScopeNodeIds,
                        program.Id,
                        MoveParentContributions: false,
                        EventDate: request.CreateSubThenMove.EventDate,
                        LogOpensAt: request.CreateSubThenMove.LogOpensAt,
                        StartsOn: request.CreateSubThenMove.EventDate,
                        EndsOn: request.CreateSubThenMove.EventDate,
                        SuppressOpenNotification: true),
                    ct);
                moveTargetId = createdSub.Id;
            }

            var target = await db.GivingPrograms.AsNoTracking().SingleOrDefaultAsync(
                p => p.Id == moveTargetId && p.ChurchId == churchId && p.ParentProgramId == program.Id,
                ct)
                ?? throw new BadRequestException("Move target must be a sub-campaign of this main campaign");

            await db.Contributions
                .Where(c => c.ProgramId == program.Id)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(c => c.ProgramId, target.Id),
                    ct);
        }
        else if (request.CreateSubThenMove is not null)
        {
            await CreateAsync(
                actor,
                authUserId,
                new CreateGivingProgramInput(
                    program.GivingType.ToString(),
                    request.CreateSubThenMove.Title ?? string.Empty,
                    request.CreateSubThenMove.PeriodLabel ?? string.Empty,
                    request.CreateSubThenMove.ScopeKind ?? program.ScopeKind.ToString(),
                    request.CreateSubThenMove.ScopeNodeId ?? program.ScopeNodeId,
                    request.CreateSubThenMove.ScopeNodeIds,
                    program.Id,
                    EventDate: request.CreateSubThenMove.EventDate,
                    LogOpensAt: request.CreateSubThenMove.LogOpensAt,
                    StartsOn: request.CreateSubThenMove.EventDate,
                    EndsOn: request.CreateSubThenMove.EventDate,
                    SuppressOpenNotification: true),
                ct);
        }

        program.ReceiveGivingsOnMain = false;
        await db.SaveChangesAsync(ct);
        readCache.InvalidateGivingDashboard(churchId);

        var parentIdsWithChildren = await LoadParentIdsWithChildrenAsync(churchId, ct);
        program = await db.GivingPrograms.AsNoTracking().SingleAsync(p => p.Id == program.Id, ct);
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
        readCache.InvalidateGivingDashboard(program.ChurchId);

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
        readCache.InvalidateGivingDashboard(program.ChurchId);

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
            readCache.InvalidateGivingDashboard(program.ChurchId);
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
        if (!scope.CanCreateGivingPrograms(actor))
            throw new ForbiddenException("You cannot create giving programs");

        if (scopeKind == ProgramScopeKind.ChurchWide)
        {
            if (!scope.CanManageChurch(actor))
                throw new ForbiddenException("Only a pastor can create church-wide giving programs");
            return;
        }

        if (scopeKind is ProgramScopeKind.FellowshipGroup or ProgramScopeKind.UnitGroup)
        {
            foreach (var nodeId in input.ScopeNodeIds ?? [])
                await ValidateScopeNodeAsync(actor, authUserId, nodeId, ct);
            return;
        }

        await ValidateScopeNodeAsync(actor, authUserId, input.ScopeNodeId, ct);
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
        var awaitingCounts = await LoadAwaitingMyApprovalCountsAsync(
            actor,
            authUserId,
            churchId,
            programs,
            ct);

        return programs
            .Select(p => ToDto(
                p,
                parentIdsWithChildren,
                creators.TryGetValue(p.CreatedByAuthUserId, out var creator)
                    ? creator
                    : new ProgramCreatorDisplay(null, null),
                totals.GetValueOrDefault(p.Id),
                directStats.GetValueOrDefault(p.Id),
                awaitingCounts.GetValueOrDefault(p.Id)))
            .ToList();
    }

    private async Task<IReadOnlyDictionary<Guid, int>> LoadAwaitingMyApprovalCountsAsync(
        Actor actor,
        Guid authUserId,
        Guid churchId,
        IReadOnlyList<GivingProgram> programs,
        CancellationToken ct)
    {
        if (programs.Count == 0)
            return new Dictionary<Guid, int>();

        if (actor.StructureRole is not ChurchRole role
            || role is ChurchRole.CellLeader or ChurchRole.Member)
        {
            return programs.ToDictionary(p => p.Id, _ => 0);
        }

        var links = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId != null)
            .Select(p => new { p.Id, p.ParentProgramId })
            .ToListAsync(ct);

        var childrenByParent = links
            .GroupBy(l => l.ParentProgramId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

        var rollupProgramIds = new HashSet<Guid>();
        var programIdSets = new Dictionary<Guid, HashSet<Guid>>();
        foreach (var program in programs)
        {
            var ids = new HashSet<Guid> { program.Id };
            foreach (var descendantId in CollectDescendantIds(program.Id, childrenByParent))
                ids.Add(descendantId);
            programIdSets[program.Id] = ids;
            foreach (var id in ids)
                rollupProgramIds.Add(id);
        }

        IQueryable<Contribution> query = db.Contributions.AsNoTracking()
            .Where(c => rollupProgramIds.Contains(c.ProgramId));

        if (!scope.IsPastor(actor))
        {
            var visibleNodes = await scope.GetActorVisibleMemberNodeIdsAsync(actor, authUserId, ct);
            if (visibleNodes.Count == 0)
                return programs.ToDictionary(p => p.Id, _ => 0);
            query = query.Where(c => visibleNodes.Contains(c.MemberParentNodeId));
        }

        query = await scope.ApplyAwaitingMyApprovalFilterAsync(query, churchId, actor, ct);
        var pendingProgramIds = await query.Select(c => c.ProgramId).ToListAsync(ct);

        return programs.ToDictionary(
            p => p.Id,
            p => pendingProgramIds.Count(pid => programIdSets[p.Id].Contains(pid)));
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
                totals[program.Id] = approvedByProgram.GetValueOrDefault(program.Id)
                    + descendantIds.Sum(id => approvedByProgram.GetValueOrDefault(id));
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
        DirectContributionStats? directStats,
        int awaitingMyApprovalCount = 0)
    {
        var hasChildren = parentIdsWithChildren.Contains(program.Id);
        var now = DateTimeOffset.UtcNow;
        var accepts = CampaignScheduling.AcceptsContributionsNow(program, now)
            && (program.ParentProgramId is not null || program.ReceiveGivingsOnMain);
        return new GivingProgramDto(
            program.Id,
            program.ParentProgramId,
            program.GivingType.ToString(),
            program.CustomTypeLabel,
            program.Title,
            program.PeriodLabel,
            program.StartsOn?.ToString("yyyy-MM-dd"),
            program.EndsOn?.ToString("yyyy-MM-dd"),
            program.GoLiveAt?.ToString("o"),
            program.EventDate?.ToString("yyyy-MM-dd"),
            program.LogOpensAt?.ToString("o"),
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
            accepts,
            program.ParentProgramId is null ? program.ReceiveGivingsOnMain : true,
            directStats?.Count ?? 0,
            directStats?.Total ?? 0m,
            awaitingMyApprovalCount);
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
