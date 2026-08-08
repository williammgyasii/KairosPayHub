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
            MemberParentNodeId = member.ParentNodeId,
            Status = ContributionStatus.PendingApproval,
        };

        db.Contributions.Add(contribution);
        await db.SaveChangesAsync(ct);

        await notifications.NotifyContributionPendingAsync(
            contribution,
            program,
            member.Name,
            ct);

        return await ToDtoAsync(contribution, ct);
    }

    public async Task<IReadOnlyList<ContributionDto>> ListForProgramAsync(
        Actor actor,
        Guid authUserId,
        Guid programId,
        ContributionStatus? status,
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

        var programIds = await scope.CollectDescendantProgramIdsIncludingSelfAsync(churchId, programId, ct);

        var query = db.Contributions.AsNoTracking()
            .Where(c => programIds.Contains(c.ProgramId));

        if (status is not null)
            query = query.Where(c => c.Status == status);

        if (!scope.IsPastor(actor))
        {
            var visibleNodes = await scope.GetActorVisibleMemberNodeIdsAsync(actor, authUserId, ct);
            if (visibleNodes.Count == 0)
                return [];
            query = query.Where(c => visibleNodes.Contains(c.MemberParentNodeId));
        }

        var rows = await query.OrderByDescending(c => c.CreatedAt).ToListAsync(ct);
        var result = new List<ContributionDto>();
        foreach (var row in rows)
            result.Add(await ToDtoAsync(row, ct));
        return result;
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
        var includesDescendants = programIds.Count > 1;

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

        var result = new List<ContributionDto>();
        foreach (var row in rows)
            result.Add(await ToDtoAsync(row, ct));
        return result;
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

        var result = new List<ContributionDto>();
        foreach (var row in rows)
            result.Add(await ToDtoAsync(row, ct));
        return result;
    }

    private async Task<Contribution> LoadContributionAsync(
        Actor actor,
        Guid programId,
        Guid contributionId,
        CancellationToken ct)
    {
        var churchId = RequireStructureChurch(actor);
        return await db.Contributions
            .Include(c => c.Program)
            .SingleOrDefaultAsync(
                c => c.Id == contributionId && c.ProgramId == programId && c.Program!.ChurchId == churchId,
                ct)
            ?? throw new ForbiddenException("Contribution not found");
    }

    private async Task<ContributionDto> ToDtoAsync(Contribution c, CancellationToken ct)
    {
        var memberName = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.Id == c.MemberId)
            .Select(m => m.Name)
            .FirstOrDefaultAsync(ct) ?? "Member";

        return new ContributionDto(
            c.Id,
            c.ProgramId,
            c.MemberId,
            memberName,
            c.Amount,
            c.Currency,
            c.DateSent,
            c.AttachmentKey,
            c.Notes,
            c.MemberParentNodeId,
            c.Status.ToString(),
            c.ApprovedAt,
            c.RejectedReason,
            c.CreatedAt);
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
    string? Notes);
