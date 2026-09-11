using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class AttendanceRollCallSyncService(KairosDbContext db, GivingScopeService scope)
{
    public async Task EnsureOccurrenceRollCallAsync(Guid occurrenceId, CancellationToken ct = default)
    {
        var occurrence = await db.AttendanceOccurrences
            .Include(o => o.MeetingType!)
            .ThenInclude(t => t!.ScopeNodes)
            .Include(o => o.ScopeSubmissions)
            .Include(o => o.Entries)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId, ct)
            ?? throw new BadRequestException("Occurrence not found");

        var meetingType = occurrence.MeetingType!;
        var scopeUnitNodeIds = await ResolveRollCallUnitNodeIdsAsync(meetingType, ct);
        if (scopeUnitNodeIds.Count == 0)
            return;

        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == meetingType.ChurchId && r.ScopeNodeId != null)
            .ToListAsync(ct);

        var members = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.ChurchId == meetingType.ChurchId && m.RosterStatus == RosterStatus.Active)
            .Select(m => new { m.Id, m.ParentNodeId })
            .ToListAsync(ct);

        var submissionsByScope = occurrence.ScopeSubmissions.ToDictionary(s => s.ScopeNodeId);
        var entriesByMember = occurrence.Entries.ToDictionary(e => e.MemberId);
        var changed = false;

        foreach (var unitNodeId in scopeUnitNodeIds)
        {
            var subtreeIds = (await scope.CollectSubtreeNodeIdsAsync(meetingType.ChurchId, unitNodeId, ct))
                .ToHashSet();
            var memberIds = members
                .Where(m => subtreeIds.Contains(m.ParentNodeId))
                .Select(m => m.Id)
                .ToList();

            if (!submissionsByScope.TryGetValue(unitNodeId, out var submission))
            {
                submission = new AttendanceScopeSubmission
                {
                    OccurrenceId = occurrence.Id,
                    ScopeNodeId = unitNodeId,
                    LockStatus = ResolveInitialLockStatus(occurrence.SubmissionOpensAt),
                };
                db.AttendanceScopeSubmissions.Add(submission);
                submissionsByScope[unitNodeId] = submission;
                changed = true;
            }

            var leaderAuthUserId = assignments
                .FirstOrDefault(a => a.ScopeNodeId == unitNodeId)
                ?.AuthUserId;

            if (submission.AssignedLeaderAuthUserId != leaderAuthUserId)
            {
                submission.AssignedLeaderAuthUserId = leaderAuthUserId;
                changed = true;
            }

            foreach (var memberId in memberIds)
            {
                if (entriesByMember.TryGetValue(memberId, out var existing))
                {
                    if (existing.MemberScopeNodeId != unitNodeId)
                    {
                        existing.MemberScopeNodeId = unitNodeId;
                        changed = true;
                    }

                    continue;
                }

                var entry = new AttendanceEntry
                {
                    OccurrenceId = occurrence.Id,
                    MemberId = memberId,
                    MemberScopeNodeId = unitNodeId,
                };
                db.AttendanceEntries.Add(entry);
                entriesByMember[memberId] = entry;
                changed = true;
            }
        }

        if (changed)
            await db.SaveChangesAsync(ct);
    }

    public Task<HashSet<Guid>> ResolveRollCallCellNodeIdsAsync(
        AttendanceMeetingType meetingType,
        CancellationToken ct = default) =>
        ResolveRollCallUnitNodeIdsAsync(meetingType, ct);

    public async Task<HashSet<Guid>> ResolveRollCallUnitNodeIdsAsync(
        AttendanceMeetingType meetingType,
        CancellationToken ct = default)
    {
        var submissionLayerId = meetingType.SubmissionLayerId
            ?? await ResolveDefaultSubmissionLayerIdAsync(meetingType.ChurchId, ct);

        if (submissionLayerId is null)
            return [];

        var unitNodes = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == meetingType.ChurchId && n.LayerId == submissionLayerId.Value)
            .Select(n => new { n.Id, n.LayerId, n.ParentNodeId })
            .ToListAsync(ct);

        var parentNodeIds = unitNodes
            .Select(n => n.ParentNodeId)
            .Where(id => id is not null)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var parentLayerByNodeId = parentNodeIds.Count == 0
            ? new Dictionary<Guid, Guid>()
            : await db.StructureNodes.AsNoTracking()
                .Where(n => parentNodeIds.Contains(n.Id))
                .ToDictionaryAsync(n => n.Id, n => n.LayerId, ct);

        // Prefer "top" nodes of this layer (exclude nested same-layer children).
        var rollCallUnitIds = unitNodes
            .Where(n =>
                n.ParentNodeId is null
                || !parentLayerByNodeId.TryGetValue(n.ParentNodeId.Value, out var parentLayerId)
                || parentLayerId != submissionLayerId.Value)
            .Select(n => n.Id)
            .ToHashSet();

        var assignedScopeIds = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == meetingType.ChurchId
                && r.ScopeNodeId != null)
            .Select(r => r.ScopeNodeId!.Value)
            .Distinct()
            .ToListAsync(ct);

        foreach (var assignedScopeId in assignedScopeIds)
        {
            if (unitNodes.Any(n => n.Id == assignedScopeId))
                rollCallUnitIds.Add(assignedScopeId);
        }

        if (meetingType.ScopeKind == ProgramScopeKind.ChurchWide)
            return rollCallUnitIds;

        if (meetingType.ScopeKind == ProgramScopeKind.FellowshipGroup)
        {
            var scoped = new HashSet<Guid>();
            foreach (var root in meetingType.ScopeNodes.Select(s => s.StructureNodeId))
            {
                foreach (var id in await scope.CollectSubtreeNodeIdsAsync(meetingType.ChurchId, root, ct))
                {
                    if (rollCallUnitIds.Contains(id))
                        scoped.Add(id);
                }
            }

            return scoped;
        }

        if (meetingType.ScopeNodeId is null)
            return [];

        var subtree = await scope.CollectSubtreeNodeIdsAsync(
            meetingType.ChurchId,
            meetingType.ScopeNodeId.Value,
            ct);
        return subtree.Where(rollCallUnitIds.Contains).ToHashSet();
    }

    async Task<Guid?> ResolveDefaultSubmissionLayerIdAsync(Guid churchId, CancellationToken ct)
    {
        var layers = await (
            from layer in db.StructureLayers.AsNoTracking()
            join template in db.StructureTemplates.AsNoTracking() on layer.TemplateId equals template.Id
            where template.ChurchId == churchId
            orderby layer.SortOrder
            select new { layer.Id, layer.StandardType, layer.SortOrder }).ToListAsync(ct);

        if (layers.Count == 0)
            return null;

        var cell = layers.FirstOrDefault(l => l.StandardType == StructureLayerType.Cell);
        if (cell is not null)
            return cell.Id;

        return layers[^1].Id;
    }

    private static AttendanceScopeLockStatus ResolveInitialLockStatus(DateTimeOffset opensAt) =>
        DateTimeOffset.UtcNow >= opensAt
            ? AttendanceScopeLockStatus.Editable
            : AttendanceScopeLockStatus.NotYetOpen;
}
