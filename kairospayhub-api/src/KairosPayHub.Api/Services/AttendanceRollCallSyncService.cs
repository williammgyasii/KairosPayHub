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
        var scopeCellNodeIds = await ResolveRollCallCellNodeIdsAsync(meetingType, ct);
        if (scopeCellNodeIds.Count == 0)
            return;

        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == meetingType.ChurchId && r.Role == ChurchRole.CellLeader)
            .ToListAsync(ct);

        var members = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.ChurchId == meetingType.ChurchId)
            .Select(m => new { m.Id, m.ParentNodeId })
            .ToListAsync(ct);

        var submissionsByScope = occurrence.ScopeSubmissions.ToDictionary(s => s.ScopeNodeId);
        var entriesByMember = occurrence.Entries.ToDictionary(e => e.MemberId);
        var changed = false;

        foreach (var cellNodeId in scopeCellNodeIds)
        {
            var subtreeIds = (await scope.CollectSubtreeNodeIdsAsync(meetingType.ChurchId, cellNodeId, ct))
                .ToHashSet();
            var memberIds = members
                .Where(m => subtreeIds.Contains(m.ParentNodeId))
                .Select(m => m.Id)
                .ToList();

            if (!submissionsByScope.TryGetValue(cellNodeId, out var submission))
            {
                submission = new AttendanceScopeSubmission
                {
                    OccurrenceId = occurrence.Id,
                    ScopeNodeId = cellNodeId,
                    LockStatus = ResolveInitialLockStatus(occurrence.SubmissionOpensAt),
                };
                db.AttendanceScopeSubmissions.Add(submission);
                submissionsByScope[cellNodeId] = submission;
                changed = true;
            }

            var leaderAuthUserId = assignments
                .FirstOrDefault(a => a.ScopeNodeId == cellNodeId)
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
                    if (existing.MemberScopeNodeId != cellNodeId)
                    {
                        existing.MemberScopeNodeId = cellNodeId;
                        changed = true;
                    }

                    continue;
                }

                var entry = new AttendanceEntry
                {
                    OccurrenceId = occurrence.Id,
                    MemberId = memberId,
                    MemberScopeNodeId = cellNodeId,
                };
                db.AttendanceEntries.Add(entry);
                entriesByMember[memberId] = entry;
                changed = true;
            }
        }

        if (changed)
            await db.SaveChangesAsync(ct);
    }

    public async Task<HashSet<Guid>> ResolveRollCallCellNodeIdsAsync(
        AttendanceMeetingType meetingType,
        CancellationToken ct = default)
    {
        var cellLayerIds = await (
            from layer in db.StructureLayers.AsNoTracking()
            join template in db.StructureTemplates.AsNoTracking() on layer.TemplateId equals template.Id
            where template.ChurchId == meetingType.ChurchId && layer.StandardType == StructureLayerType.Cell
            orderby layer.SortOrder
            select layer.Id).ToListAsync(ct);

        if (cellLayerIds.Count == 0)
            return [];

        var primaryCellLayerId = cellLayerIds[0];
        var cellNodes = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == meetingType.ChurchId && cellLayerIds.Contains(n.LayerId))
            .Select(n => new { n.Id, n.LayerId, n.ParentNodeId })
            .ToListAsync(ct);

        var parentNodeIds = cellNodes
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

        var rollCallCellIds = cellNodes
            .Where(n =>
                n.LayerId == primaryCellLayerId
                && (n.ParentNodeId is null
                    || !parentLayerByNodeId.TryGetValue(n.ParentNodeId.Value, out var parentLayerId)
                    || parentLayerId != primaryCellLayerId))
            .Select(n => n.Id)
            .ToHashSet();

        var assignedCellScopeIds = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == meetingType.ChurchId
                && r.Role == ChurchRole.CellLeader
                && r.ScopeNodeId != null)
            .Select(r => r.ScopeNodeId!.Value)
            .Distinct()
            .ToListAsync(ct);

        foreach (var assignedScopeId in assignedCellScopeIds)
            rollCallCellIds.Add(assignedScopeId);

        if (meetingType.ScopeKind == ProgramScopeKind.ChurchWide)
            return rollCallCellIds;

        if (meetingType.ScopeKind == ProgramScopeKind.FellowshipGroup)
        {
            var scoped = new HashSet<Guid>();
            foreach (var root in meetingType.ScopeNodes.Select(s => s.StructureNodeId))
            {
                foreach (var id in await scope.CollectSubtreeNodeIdsAsync(meetingType.ChurchId, root, ct))
                {
                    if (rollCallCellIds.Contains(id))
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
        return subtree.Where(rollCallCellIds.Contains).ToHashSet();
    }

    private static AttendanceScopeLockStatus ResolveInitialLockStatus(DateTimeOffset opensAt) =>
        DateTimeOffset.UtcNow >= opensAt
            ? AttendanceScopeLockStatus.Editable
            : AttendanceScopeLockStatus.NotYetOpen;
}
