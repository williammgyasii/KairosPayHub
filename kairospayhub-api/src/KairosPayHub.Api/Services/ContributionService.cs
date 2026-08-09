using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Storage;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class ContributionService(
    KairosDbContext db,
    GivingScopeService scope,
    NotificationService notifications,
    IObjectStorage storage)
{
    private static readonly HashSet<string> AllowedAttachmentTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    private const int MaxAttachmentBytes = 5 * 1024 * 1024;

    public async Task<GivingAttachmentDto> UploadAttachmentAsync(
        Actor actor,
        Stream file,
        string contentType,
        long contentLength,
        CancellationToken ct = default)
    {
        _ = RequireStructureChurch(actor);

        if (!storage.IsConfigured)
            throw new ObjectStorageNotConfiguredException();

        if (!AllowedAttachmentTypes.Contains(contentType))
            throw new BadRequestException("Attachment must be JPEG, PNG, or WebP");

        if (contentLength <= 0 || contentLength > MaxAttachmentBytes)
            throw new BadRequestException("Attachment must be between 1 byte and 5 MB");

        var ext = contentType switch
        {
            "image/png" => "png",
            "image/webp" => "webp",
            _ => "jpg",
        };
        var key = $"giving/{actor.StructureChurchId}/{Guid.NewGuid():N}.{ext}";
        var url = await storage.UploadAsync(key, file, contentType, ct);
        return new GivingAttachmentDto(key, url);
    }

    public async Task<(Stream Stream, string ContentType)> OpenAttachmentAsync(
        Actor actor,
        string key,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        if (string.IsNullOrWhiteSpace(key)
            || !key.StartsWith($"giving/{churchId}/", StringComparison.Ordinal))
        {
            throw new ForbiddenException("Attachment not found");
        }

        if (!storage.IsConfigured)
            throw new ObjectStorageNotConfiguredException();

        var belongsToChurch = await db.Contributions.AsNoTracking()
            .AnyAsync(
                c => c.AttachmentKey == key && c.Program!.ChurchId == churchId,
                ct);
        if (!belongsToChurch)
            throw new ForbiddenException("Attachment not found");

        var opened = await storage.TryOpenReadAsync(key.Trim(), ct)
            ?? throw new BadRequestException("Attachment file not found in storage");

        return opened;
    }

    public async Task<ContributionDto> CreateAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        CreateContributionInput input,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var program = await db.GivingPrograms.SingleOrDefaultAsync(
            p => p.Id == programId && p.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Program not found");

        var member = await db.ChurchMembers.SingleOrDefaultAsync(
            m => m.Id == input.MemberId && m.ChurchId == churchId, ct)
            ?? throw new BadRequestException("Member not found");

        if (string.IsNullOrWhiteSpace(input.AttachmentKey))
            throw new BadRequestException("Attachment is required");

        if (input.Amount <= 0)
            throw new BadRequestException("Amount must be greater than zero");

        if (program.ApprovalStatus != ProgramApprovalStatus.Approved)
            throw new BadRequestException("Contributions can only be logged on approved sub-givings");

        if (!await scope.CanEnterContributionAsync(actor, authUserId, program, member, ct))
            throw new ForbiddenException("You cannot log contributions for this member");

        if (await db.GivingPrograms.AnyAsync(p => p.ParentProgramId == program.Id, ct))
            throw new BadRequestException("Contributions must be logged on a sub-period, not on a parent giving");

        var contribution = new Contribution
        {
            ProgramId = program.Id,
            MemberId = member.Id,
            Amount = input.Amount,
            Currency = string.IsNullOrWhiteSpace(input.Currency) ? "GHS" : input.Currency.Trim(),
            DateSent = input.DateSent,
            AttachmentKey = input.AttachmentKey.Trim(),
            Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim(),
            EnteredByAuthUserId = authUserId,
            EnteredByRole = actor.StructureRole,
            MemberParentNodeId = member.ParentNodeId,
            Status = ContributionStatus.PendingApproval,
            SentToPastor = input.SentToPastor,
            RemittanceMedium = ParseRemittanceMedium(input.RemittanceMedium),
            RemittanceMediumOther = string.IsNullOrWhiteSpace(input.RemittanceMediumOther)
                ? null
                : input.RemittanceMediumOther.Trim(),
            BatchId = input.BatchId,
        };

        db.Contributions.Add(contribution);
        await db.SaveChangesAsync(ct);

        var enterers = await GivingProgramCreatorResolver.ResolveForProgramsAsync(
            db,
            churchId,
            [(authUserId, actor.StructureRole)],
            ct);
        enterers.TryGetValue(authUserId, out var enterer);

        await notifications.NotifyContributionPendingAsync(
            contribution,
            program,
            member.Name,
            enterer?.Name,
            enterer?.ScopeUnitName,
            ct);

        return await ToDtoAsync(contribution, ct);
    }

    private static RemittanceMedium? ParseRemittanceMedium(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return Enum.TryParse<RemittanceMedium>(value, ignoreCase: true, out var parsed)
            ? parsed
            : throw new BadRequestException($"Unknown remittance medium: {value}");
    }

    public async Task<ContributionListResponse> ListForProgramAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        int page,
        int pageSize,
        string? sortBy,
        string? sortDir,
        ContributionStatus? status,
        string? search,
        bool awaitingMyApproval,
        Guid? batchId = null,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var program = await db.GivingPrograms.AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == programId && p.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Program not found");

        if (!scope.IsPastor(actor)
            && !await scope.CanAccessProgramByIdAsync(churchId, programId, actor, authUserId, ct))
        {
            throw new ForbiddenException("Program not found");
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var programIds = await scope.CollectDescendantProgramIdsIncludingSelfAsync(churchId, programId, ct);

        var baseQuery = db.Contributions.AsNoTracking()
            .Where(c => programIds.Contains(c.ProgramId));

        baseQuery = await ApplyActorContributionScopeAsync(baseQuery, actor, authUserId, ct);
        if (baseQuery is null)
        {
            return EmptyContributionListResponse(page, pageSize);
        }

        return await QueryContributionsAsync(
            baseQuery,
            churchId,
            actor,
            page,
            pageSize,
            sortBy,
            sortDir,
            status,
            search,
            awaitingMyApproval,
            batchId,
            ct);
    }

    public async Task<ContributionListResponse> ListAllAsync(
        Actor actor,
        Guid authUserId,
        Guid? programId,
        int page,
        int pageSize,
        string? sortBy,
        string? sortDir,
        ContributionStatus? status,
        string? search,
        bool awaitingMyApproval = false,
        Guid? batchId = null,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var baseQuery = db.Contributions.AsNoTracking()
            .Where(c => c.Program!.ChurchId == churchId);

        if (programId is Guid scopedProgramId)
        {
            _ = await db.GivingPrograms.AsNoTracking()
                    .SingleOrDefaultAsync(p => p.Id == scopedProgramId && p.ChurchId == churchId, ct)
                ?? throw new ForbiddenException("Program not found");

            if (!scope.IsPastor(actor)
                && !await scope.CanAccessProgramByIdAsync(churchId, scopedProgramId, actor, authUserId, ct))
            {
                throw new ForbiddenException("Program not found");
            }

            var programIds = await scope.CollectDescendantProgramIdsIncludingSelfAsync(
                churchId,
                scopedProgramId,
                ct);
            baseQuery = baseQuery.Where(c => programIds.Contains(c.ProgramId));
        }

        baseQuery = await ApplyActorContributionScopeAsync(baseQuery, actor, authUserId, ct);
        if (baseQuery is null)
        {
            return EmptyContributionListResponse(page, pageSize);
        }

        return await QueryContributionsAsync(
            baseQuery,
            churchId,
            actor,
            page,
            pageSize,
            sortBy,
            sortDir,
            status,
            search,
            awaitingMyApproval,
            batchId,
            ct);
    }

    public async Task<MemberGivingTotalsResponse> ListMemberTotalsAsync(
        Actor actor,
        Guid authUserId,
        Guid? programId,
        int page,
        int pageSize,
        string? sortBy,
        string? sortDir,
        string? search,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var baseQuery = db.Contributions.AsNoTracking()
            .Where(c => c.Program!.ChurchId == churchId);

        if (programId is Guid scopedProgramId)
        {
            _ = await db.GivingPrograms.AsNoTracking()
                    .SingleOrDefaultAsync(p => p.Id == scopedProgramId && p.ChurchId == churchId, ct)
                ?? throw new ForbiddenException("Program not found");

            if (!scope.IsPastor(actor)
                && !await scope.CanAccessProgramByIdAsync(churchId, scopedProgramId, actor, authUserId, ct))
            {
                throw new ForbiddenException("Program not found");
            }

            var programIds = await scope.CollectDescendantProgramIdsIncludingSelfAsync(
                churchId,
                scopedProgramId,
                ct);
            baseQuery = baseQuery.Where(c => programIds.Contains(c.ProgramId));
        }

        baseQuery = await ApplyActorContributionScopeAsync(baseQuery, actor, authUserId, ct);
        if (baseQuery is null)
        {
            return EmptyMemberGivingTotalsResponse(page, pageSize);
        }

        var grouped = baseQuery.GroupBy(c => c.MemberId);

        var projected = grouped.Select(g => new MemberTotalProjection
        {
            MemberId = g.Key,
            ApprovedTotal = g.Sum(c => c.Status == ContributionStatus.Approved ? c.Amount : 0m),
            ApprovedCount = g.Sum(c => c.Status == ContributionStatus.Approved ? 1 : 0),
            PendingCount = g.Sum(c => c.Status == ContributionStatus.PendingApproval ? 1 : 0),
            PendingTotal = g.Sum(c => c.Status == ContributionStatus.PendingApproval ? c.Amount : 0m),
            LastDateSent = g.Where(c => c.Status == ContributionStatus.Approved)
                .Max(c => (DateTimeOffset?)c.DateSent),
            MemberParentNodeId = g.OrderByDescending(c => c.DateSent).Select(c => c.MemberParentNodeId).First(),
        });

        var withMembers =
            from row in projected
            join member in db.ChurchMembers.AsNoTracking() on row.MemberId equals member.Id
            where member.ChurchId == churchId && row.ApprovedCount > 0
            select new MemberTotalRow
            {
                MemberId = row.MemberId,
                MemberName = member.Name,
                MemberParentNodeId = row.MemberParentNodeId,
                ApprovedTotal = row.ApprovedTotal,
                ApprovedCount = row.ApprovedCount,
                PendingCount = row.PendingCount,
                PendingTotal = row.PendingTotal,
                LastDateSent = row.LastDateSent,
            };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            withMembers = withMembers.Where(row => EF.Functions.ILike(row.MemberName, term));
        }

        var totalCount = await withMembers.CountAsync(ct);

        var summaryRows = await withMembers.ToListAsync(ct);
        var summary = new MemberGivingTotalsSummary(
            summaryRows.Sum(row => row.ApprovedTotal),
            summaryRows.Count,
            summaryRows.Count,
            summaryRows.Sum(row => row.ApprovedCount),
            summaryRows.Sum(row => row.PendingCount),
            summaryRows.Sum(row => row.PendingTotal));

        var rankMap = summaryRows
            .OrderByDescending(row => row.ApprovedTotal)
            .ThenBy(row => row.MemberName, StringComparer.OrdinalIgnoreCase)
            .Select((row, index) => (row.MemberId, Rank: index + 1))
            .ToDictionary(pair => pair.MemberId, pair => pair.Rank);

        var sorted = ApplyMemberTotalSort(withMembers, sortBy, sortDir);
        var rows = await sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var members = rows.Select(row => new MemberGivingTotalDto(
            rankMap.GetValueOrDefault(row.MemberId, 0),
            row.MemberId,
            row.MemberName,
            row.MemberParentNodeId,
            row.ApprovedTotal,
            row.ApprovedCount,
            row.PendingCount,
            row.PendingTotal,
            row.LastDateSent)).ToList();

        return new MemberGivingTotalsResponse(members, totalCount, page, pageSize, summary);
    }

    private sealed class MemberTotalProjection
    {
        public Guid MemberId { get; set; }
        public decimal ApprovedTotal { get; set; }
        public int ApprovedCount { get; set; }
        public int PendingCount { get; set; }
        public decimal PendingTotal { get; set; }
        public DateTimeOffset? LastDateSent { get; set; }
        public Guid MemberParentNodeId { get; set; }
    }

    private sealed class MemberTotalRow
    {
        public Guid MemberId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public Guid MemberParentNodeId { get; set; }
        public decimal ApprovedTotal { get; set; }
        public int ApprovedCount { get; set; }
        public int PendingCount { get; set; }
        public decimal PendingTotal { get; set; }
        public DateTimeOffset? LastDateSent { get; set; }
    }

    private static MemberGivingTotalsResponse EmptyMemberGivingTotalsResponse(int page, int pageSize) =>
        new([], 0, page, pageSize, new MemberGivingTotalsSummary(0, 0, 0, 0, 0, 0));

    private static IQueryable<MemberTotalRow> ApplyMemberTotalSort(
        IQueryable<MemberTotalRow> query,
        string? sortBy,
        string? sortDir)
    {
        var desc = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        return sortBy?.ToLowerInvariant() switch
        {
            "membername" => desc
                ? query.OrderByDescending(row => row.MemberName).ThenByDescending(row => row.ApprovedTotal)
                : query.OrderBy(row => row.MemberName).ThenByDescending(row => row.ApprovedTotal),
            "approvedcount" => desc
                ? query.OrderByDescending(row => row.ApprovedCount).ThenByDescending(row => row.ApprovedTotal)
                : query.OrderBy(row => row.ApprovedCount).ThenByDescending(row => row.ApprovedTotal),
            "pendingcount" => desc
                ? query.OrderByDescending(row => row.PendingCount).ThenByDescending(row => row.ApprovedTotal)
                : query.OrderBy(row => row.PendingCount).ThenByDescending(row => row.ApprovedTotal),
            "lastdatesent" => desc
                ? query.OrderByDescending(row => row.LastDateSent).ThenByDescending(row => row.ApprovedTotal)
                : query.OrderBy(row => row.LastDateSent).ThenByDescending(row => row.ApprovedTotal),
            _ => desc
                ? query.OrderByDescending(row => row.ApprovedTotal).ThenBy(row => row.MemberName)
                : query.OrderBy(row => row.ApprovedTotal).ThenBy(row => row.MemberName),
        };
    }

    private static ContributionListResponse EmptyContributionListResponse(int page, int pageSize) =>
        new([], 0, page, pageSize, new ContributionListSummary(0, 0, 0, 0, 0, 0));

    private async Task<IQueryable<Contribution>?> ApplyActorContributionScopeAsync(
        IQueryable<Contribution> baseQuery,
        Actor actor,
        Guid authUserId,
        CancellationToken ct)
    {
        if (scope.IsPastor(actor))
            return baseQuery;

        var visibleNodes = await scope.GetActorVisibleMemberNodeIdsAsync(actor, authUserId, ct);
        if (visibleNodes.Count == 0)
            return null;

        return baseQuery.Where(c => visibleNodes.Contains(c.MemberParentNodeId));
    }

    private async Task<ContributionListResponse> QueryContributionsAsync(
        IQueryable<Contribution> baseQuery,
        Guid churchId,
        Actor actor,
        int page,
        int pageSize,
        string? sortBy,
        string? sortDir,
        ContributionStatus? status,
        string? search,
        bool awaitingMyApproval,
        Guid? batchId,
        CancellationToken ct)
    {
        var summary = await BuildSummaryAsync(baseQuery, churchId, actor, ct);

        var query = baseQuery;

        if (status is not null)
            query = query.Where(c => c.Status == status);

        if (batchId is Guid batchFilter)
            query = query.Where(c => c.BatchId == batchFilter);

        if (awaitingMyApproval)
            query = await scope.ApplyAwaitingMyApprovalFilterAsync(query, churchId, actor, ct);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(c =>
                db.ChurchMembers.Any(m =>
                    m.Id == c.MemberId
                    && m.ChurchId == churchId
                    && EF.Functions.ILike(m.Name, term))
                || (c.Notes != null && EF.Functions.ILike(c.Notes, term))
                || db.GivingPrograms.Any(p =>
                    p.Id == c.ProgramId
                    && (EF.Functions.ILike(p.Title, term)
                        || EF.Functions.ILike(p.PeriodLabel, term))));
        }

        var totalCount = await query.CountAsync(ct);
        var rows = await ApplyContributionSort(query, sortBy, sortDir)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var contributions = await MapToDtosAsync(rows, ct);
        return new ContributionListResponse(contributions, totalCount, page, pageSize, summary);
    }

    private async Task<ContributionListSummary> BuildSummaryAsync(
        IQueryable<Contribution> baseQuery,
        Guid churchId,
        Actor actor,
        CancellationToken ct)
    {
        var pending = baseQuery.Where(c => c.Status == ContributionStatus.PendingApproval);
        var approved = baseQuery.Where(c => c.Status == ContributionStatus.Approved);
        var rejected = baseQuery.Where(c => c.Status == ContributionStatus.Rejected);

        var pendingCount = await pending.CountAsync(ct);
        var pendingTotal = pendingCount == 0
            ? 0
            : await pending.SumAsync(c => c.Amount, ct);
        var approvedCount = await approved.CountAsync(ct);
        var approvedTotal = approvedCount == 0
            ? 0
            : await approved.SumAsync(c => c.Amount, ct);
        var rejectedCount = await rejected.CountAsync(ct);

        var awaitingQuery = await scope.ApplyAwaitingMyApprovalFilterAsync(
            baseQuery,
            churchId,
            actor,
            ct);
        var awaitingMyApprovalCount = await awaitingQuery.CountAsync(ct);

        return new ContributionListSummary(
            pendingCount,
            pendingTotal,
            awaitingMyApprovalCount,
            approvedCount,
            approvedTotal,
            rejectedCount);
    }

    private IQueryable<Contribution> ApplyContributionSort(
        IQueryable<Contribution> query,
        string? sortBy,
        string? sortDir)
    {
        var desc = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        return sortBy?.ToLowerInvariant() switch
        {
            "amount" => desc
                ? query.OrderByDescending(c => c.Amount).ThenByDescending(c => c.CreatedAt)
                : query.OrderBy(c => c.Amount).ThenBy(c => c.CreatedAt),
            "datesent" => desc
                ? query.OrderByDescending(c => c.DateSent).ThenByDescending(c => c.CreatedAt)
                : query.OrderBy(c => c.DateSent).ThenBy(c => c.CreatedAt),
            "membername" => desc
                ? query.OrderByDescending(c =>
                    db.ChurchMembers.Where(m => m.Id == c.MemberId).Select(m => m.Name).FirstOrDefault())
                    .ThenByDescending(c => c.CreatedAt)
                : query.OrderBy(c =>
                    db.ChurchMembers.Where(m => m.Id == c.MemberId).Select(m => m.Name).FirstOrDefault())
                    .ThenBy(c => c.CreatedAt),
            "status" => desc
                ? query.OrderByDescending(c => c.Status).ThenByDescending(c => c.CreatedAt)
                : query.OrderBy(c => c.Status).ThenBy(c => c.CreatedAt),
            "approvedat" => desc
                ? query.OrderByDescending(c => c.ApprovedAt).ThenByDescending(c => c.CreatedAt)
                : query.OrderBy(c => c.ApprovedAt).ThenBy(c => c.CreatedAt),
            "programtitle" => desc
                ? query.OrderByDescending(c =>
                    db.GivingPrograms.Where(p => p.Id == c.ProgramId).Select(p => p.Title).FirstOrDefault())
                    .ThenByDescending(c => c.CreatedAt)
                : query.OrderBy(c =>
                    db.GivingPrograms.Where(p => p.Id == c.ProgramId).Select(p => p.Title).FirstOrDefault())
                    .ThenBy(c => c.CreatedAt),
            _ => desc
                ? query.OrderByDescending(c => c.CreatedAt)
                : query.OrderBy(c => c.CreatedAt),
        };
    }

    public async Task<ContributionDto> ApproveAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        Guid contributionId,
        CancellationToken ct = default)
    {
        var contribution = await LoadContributionAsync(actor, programId, contributionId, ct);
        var program = contribution.Program!;

        if (!await scope.CanApproveContributionAsync(actor, authUserId, program, contribution, ct))
            throw new ForbiddenException("You cannot approve this contribution");

        if (contribution.Status != ContributionStatus.PendingApproval)
            throw new BadRequestException("Contribution is not pending approval");

        contribution.Status = ContributionStatus.Approved;
        contribution.ApprovedByAuthUserId = authUserId;
        contribution.ApprovedAt = DateTimeOffset.UtcNow;
        contribution.RejectedReason = null;
        await db.SaveChangesAsync(ct);

        var memberName = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.Id == contribution.MemberId)
            .Select(m => m.Name)
            .FirstOrDefaultAsync(ct) ?? "Member";
        await notifications.NotifyContributionReviewedAsync(
            contribution,
            program,
            memberName,
            approved: true,
            ct);

        return await ToDtoAsync(contribution, ct);
    }

    public async Task<ContributionDto> RejectAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        Guid contributionId,
        string? reason,
        CancellationToken ct = default)
    {
        var contribution = await LoadContributionAsync(actor, programId, contributionId, ct);
        var program = contribution.Program!;

        if (!await scope.CanApproveContributionAsync(actor, authUserId, program, contribution, ct))
            throw new ForbiddenException("You cannot reject this contribution");

        if (contribution.Status != ContributionStatus.PendingApproval)
            throw new BadRequestException("Contribution is not pending approval");

        contribution.Status = ContributionStatus.Rejected;
        contribution.ApprovedByAuthUserId = authUserId;
        contribution.ApprovedAt = DateTimeOffset.UtcNow;
        contribution.RejectedReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        await db.SaveChangesAsync(ct);

        var memberName = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.Id == contribution.MemberId)
            .Select(m => m.Name)
            .FirstOrDefaultAsync(ct) ?? "Member";
        await notifications.NotifyContributionReviewedAsync(
            contribution,
            program,
            memberName,
            approved: false,
            ct);

        return await ToDtoAsync(contribution, ct);
    }

    public async Task<GivingProgramRollupDto> GetRollupAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var program = await db.GivingPrograms.AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == programId && p.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Program not found");

        if (!scope.IsPastor(actor))
        {
            if (actor.StructureRole is not (ChurchRole.PFCCManager or ChurchRole.FellowshipLeader))
                throw new ForbiddenException("Rollup is not available for your role");

            if (!await scope.CanAccessProgramByIdAsync(churchId, programId, actor, authUserId, ct))
                throw new ForbiddenException("Program not found");
        }

        var programIds = await scope.CollectDescendantProgramIdsIncludingSelfAsync(churchId, programId, ct);
        var hasChildren = programIds.Count > 1;
        if (hasChildren)
            programIds = programIds.Where(id => id != programId).ToList();

        var includesDescendants = hasChildren;

        var approved = await db.Contributions.AsNoTracking()
            .Where(c => programIds.Contains(c.ProgramId) && c.Status == ContributionStatus.Approved)
            .Select(c => new { c.Amount, c.MemberParentNodeId })
            .ToListAsync(ct);

        if (!scope.IsPastor(actor))
        {
            var visibleNodes = await scope.GetActorVisibleMemberNodeIdsAsync(actor, authUserId, ct);
            approved = approved.Where(a => visibleNodes.Contains(a.MemberParentNodeId)).ToList();
        }

        var nodes = await db.StructureNodes.AsNoTracking()
            .Include(n => n.Layer)
            .Where(n => n.ChurchId == churchId)
            .ToListAsync(ct);

        var nodeMap = nodes.ToDictionary(n => n.Id);
        var buckets = new Dictionary<string, RollupAccumulator>();

        foreach (var row in approved)
        {
            var chain = AncestorChain(row.MemberParentNodeId, nodeMap);
            foreach (var node in chain)
            {
                var key = $"{node.Layer!.StandardType}:{node.Id}";
                if (!buckets.TryGetValue(key, out var acc))
                {
                    acc = new RollupAccumulator(node.Id, node.Name, node.Layer!.StandardType.ToString());
                    buckets[key] = acc;
                }
                acc.Total += row.Amount;
                acc.Count += 1;
            }
        }

        var rollupRows = buckets.Values
            .OrderBy(b => b.LayerType)
            .ThenBy(b => b.NodeName)
            .ToList();

        if (!scope.IsPastor(actor))
        {
            var subtreeIds = await scope.GetActorStructureSubtreeNodeIdsAsync(actor, authUserId, ct);
            rollupRows = rollupRows.Where(b => subtreeIds.Contains(b.NodeId)).ToList();

            var scopeNodeId = await scope.GetActorScopeNodeIdAsync(actor, authUserId, ct);
            if (scopeNodeId is Guid leaderScopeNodeId)
                rollupRows = rollupRows.Where(b => b.NodeId != leaderScopeNodeId).ToList();
        }

        return new GivingProgramRollupDto(
            program.Id,
            approved.Sum(a => a.Amount),
            approved.Count,
            includesDescendants,
            rollupRows
                .Select(b => new GivingRollupRowDto(b.NodeId, b.NodeName, b.LayerType, b.Total, b.Count))
                .ToList());
    }

    public async Task<IReadOnlyList<ContributionDto>> ListMineAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var member = await db.ChurchMembers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.ChurchId == churchId && m.AuthUserId == authUserId, ct);

        if (member is null)
            return [];

        var rows = await db.Contributions.AsNoTracking()
            .Where(c => c.MemberId == member.Id)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

        return await MapToDtosAsync(rows, ct);
    }

    public async Task<IReadOnlyList<ContributionDto>> ListForMemberAsync(
        Actor actor,
        Guid authUserId,
        Guid memberId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var member = await db.ChurchMembers.AsNoTracking()
            .SingleOrDefaultAsync(m => m.Id == memberId && m.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Member not found");

        if (!await scope.CanViewMemberContributionsAsync(actor, authUserId, member, ct))
            throw new ForbiddenException("You cannot view this member's giving");

        var rows = await db.Contributions.AsNoTracking()
            .Where(c => c.MemberId == memberId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

        return await MapToDtosAsync(rows, ct);
    }

    private async Task<Contribution> LoadContributionAsync(
        Actor actor,
        Guid programId,
        Guid contributionId,
        CancellationToken ct)
    {
        var churchId = RequireStructureChurch(actor);
        var programIds = await scope.CollectDescendantProgramIdsIncludingSelfAsync(churchId, programId, ct);

        return await db.Contributions
            .Include(c => c.Program)
            .SingleOrDefaultAsync(
                c => c.Id == contributionId
                    && programIds.Contains(c.ProgramId)
                    && c.Program!.ChurchId == churchId,
                ct)
            ?? throw new ForbiddenException("Contribution not found");
    }

    private async Task<IReadOnlyList<ContributionDto>> MapToDtosAsync(
        IReadOnlyList<Contribution> contributions,
        CancellationToken ct)
    {
        if (contributions.Count == 0)
            return [];

        var programIds = contributions.Select(c => c.ProgramId).Distinct().ToList();
        var programs = await db.GivingPrograms.AsNoTracking()
            .Where(p => programIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        var churchIds = programs.Values.Select(p => p.ChurchId).Distinct().ToList();
        if (churchIds.Count != 1)
            throw new InvalidOperationException("Contributions must belong to a single church");

        var churchId = churchIds[0];
        var parentIdsWithChildren = await db.GivingPrograms.AsNoTracking()
            .Where(p => p.ChurchId == churchId && p.ParentProgramId != null)
            .Select(p => p.ParentProgramId!.Value)
            .Distinct()
            .ToHashSetAsync(ct);

        var memberIds = contributions.Select(c => c.MemberId).Distinct().ToList();
        var memberNames = await db.ChurchMembers.AsNoTracking()
            .Where(m => memberIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.Name, ct);

        var enterers = await GivingProgramCreatorResolver.ResolveForProgramsAsync(
            db,
            churchId,
            contributions.Select(c => (c.EnteredByAuthUserId, c.EnteredByRole)),
            ct);

        var approvers = await GivingProgramCreatorResolver.ResolveForProgramsAsync(
            db,
            churchId,
            contributions
                .Where(c => c.ApprovedByAuthUserId is not null)
                .Select(c => (c.ApprovedByAuthUserId!.Value, (ChurchRole?)null)),
            ct);

        var result = new List<ContributionDto>(contributions.Count);

        foreach (var c in contributions)
        {
            programs.TryGetValue(c.ProgramId, out var program);
            enterers.TryGetValue(c.EnteredByAuthUserId, out var enterer);
            string? approvedByName = null;
            if (c.ApprovedByAuthUserId is Guid approverId
                && approvers.TryGetValue(approverId, out var approver))
            {
                approvedByName = approver.Name;
            }

            string? pendingApproverRole = null;
            if (c.Status == ContributionStatus.PendingApproval && program is not null)
            {
                var approvingRole = await scope.ResolveContributionApprovingRoleAsync(
                    program.ChurchId,
                    c.EnteredByRole,
                    ct);
                pendingApproverRole = approvingRole?.ToString();
            }

            result.Add(new ContributionDto(
                c.Id,
                c.ProgramId,
                program?.Title ?? "Giving",
                program?.PeriodLabel ?? "",
                program?.ParentProgramId is not null,
                program?.ParentProgramId is null && parentIdsWithChildren.Contains(c.ProgramId),
                c.MemberId,
                memberNames.GetValueOrDefault(c.MemberId) ?? "Member",
                c.Amount,
                c.Currency,
                c.DateSent,
                c.AttachmentKey,
                storage.PublicUrlForKey(c.AttachmentKey),
                c.Notes,
                c.MemberParentNodeId,
                c.Status.ToString(),
                c.EnteredByRole?.ToString(),
                enterer?.Name,
                enterer?.ScopeUnitName,
                c.SentToPastor,
                c.RemittanceMedium?.ToString(),
                c.RemittanceMediumOther,
                c.BatchId,
                pendingApproverRole,
                c.ApprovedAt,
                approvedByName,
                c.RejectedReason,
                c.CreatedAt));
        }

        return result;
    }

    private async Task<ContributionDto> ToDtoAsync(Contribution c, CancellationToken ct)
    {
        var mapped = await MapToDtosAsync([c], ct);
        return mapped[0];
    }

    private static List<StructureNode> AncestorChain(
        Guid leafNodeId,
        Dictionary<Guid, StructureNode> nodeMap)
    {
        var chain = new List<StructureNode>();
        var currentId = leafNodeId;
        while (nodeMap.TryGetValue(currentId, out var node))
        {
            chain.Add(node);
            if (node.ParentNodeId is null) break;
            currentId = node.ParentNodeId.Value;
        }
        return chain;
    }

    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }

    private sealed class RollupAccumulator(
        Guid nodeId,
        string nodeName,
        string layerType)
    {
        public Guid NodeId { get; } = nodeId;
        public string NodeName { get; } = nodeName;
        public string LayerType { get; } = layerType;
        public decimal Total { get; set; }
        public int Count { get; set; }
    }
}

public record CreateContributionInput(
    Guid MemberId,
    decimal Amount,
    string? Currency,
    DateTimeOffset DateSent,
    string AttachmentKey,
    string? Notes,
    bool? SentToPastor = null,
    string? RemittanceMedium = null,
    string? RemittanceMediumOther = null,
    Guid? BatchId = null);
