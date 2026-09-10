using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Shared persistence helpers for attendance occurrence query, roll-call write, and approval.
/// </summary>
public class AttendanceSubmissionSupport(KairosDbContext db, AttendanceScopeService scope)
{
    public Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }

    public async Task<AttendanceScopeSubmission> LoadScopeSubmissionAsync(
        Guid churchId,
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        return await db.AttendanceScopeSubmissions
            .Include(s => s.Occurrence!)
            .ThenInclude(o => o.MeetingType)
            .SingleOrDefaultAsync(
                s => s.OccurrenceId == occurrenceId
                    && s.ScopeNodeId == scopeNodeId
                    && s.Occurrence!.ChurchId == churchId,
                ct)
            ?? throw new ForbiddenException("Scope submission not found");
    }

    public async Task<(int Present, int Absent, int Total)> RollCallCountsForScopeAsync(
        Guid churchId,
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        var entries = await EntriesInScopeAsync(churchId, occurrenceId, scopeNodeId, ct);
        var present = entries.Count(e => e.Status == AttendanceEntryStatus.Present);
        var absent = entries.Count(e => e.Status == AttendanceEntryStatus.Absent);
        return (present, absent, entries.Count);
    }

    public async Task<HashSet<Guid>> VisibleScopeNodeIdsAsync(
        Actor actor,
        Guid authUserId,
        AttendanceOccurrence occurrence,
        CancellationToken ct)
    {
        if (scope.CanManageChurch(actor))
            return occurrence.ScopeSubmissions.Select(s => s.ScopeNodeId).ToHashSet();

        var visible = new HashSet<Guid>();

        if (actor.StructureRole is ChurchRole approverRole
            && approverRole is ChurchRole.FellowshipLeader or ChurchRole.PFCCManager)
        {
            var assignmentScopeIds = await db.RoleAssignments.AsNoTracking()
                .Where(r =>
                    r.ChurchId == actor.StructureChurchId
                    && r.AuthUserId == authUserId
                    && r.Role == approverRole
                    && r.ScopeNodeId != null)
                .Select(r => r.ScopeNodeId!.Value)
                .ToListAsync(ct);

            foreach (var assignmentScopeId in assignmentScopeIds)
            {
                foreach (var submission in occurrence.ScopeSubmissions)
                {
                    if (await scope.IsNodeInSubtreeAsync(
                            actor.StructureChurchId,
                            assignmentScopeId,
                            submission.ScopeNodeId,
                            ct))
                    {
                        visible.Add(submission.ScopeNodeId);
                    }
                }
            }
        }

        var cellLeaderScopeIds = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == actor.StructureChurchId
                && r.AuthUserId == authUserId
                && r.Role == ChurchRole.CellLeader
                && r.ScopeNodeId != null)
            .Select(r => r.ScopeNodeId!.Value)
            .ToListAsync(ct);

        foreach (var cellScopeId in cellLeaderScopeIds)
            visible.Add(cellScopeId);

        foreach (var submission in occurrence.ScopeSubmissions)
        {
            if (submission.AssignedLeaderAuthUserId == authUserId)
                visible.Add(submission.ScopeNodeId);
        }

        return visible;
    }

    public static string EffectiveLockStatus(
        AttendanceScopeSubmission submission,
        AttendanceOccurrence occurrence)
    {
        if (submission.ApprovalStatus is AttendanceScopeApprovalStatus.Draft
            or AttendanceScopeApprovalStatus.Rejected)
        {
            return AttendanceScopeLockStatus.Editable.ToString();
        }

        var now = DateTimeOffset.UtcNow;
        if (submission.LockStatus == AttendanceScopeLockStatus.NotYetOpen
            && now >= occurrence.SubmissionOpensAt
            && now < occurrence.SubmissionDeadlineAt)
        {
            return AttendanceScopeLockStatus.Editable.ToString();
        }

        return submission.LockStatus.ToString();
    }

    public async Task<List<AttendanceEntry>> EntriesInScopeAsync(
        Guid churchId,
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        var subtreeIds = (await scope.CollectSubtreeNodeIdsAsync(churchId, scopeNodeId, ct)).ToHashSet();
        var entries = await db.AttendanceEntries
            .Include(e => e.Member)
            .Where(e => e.OccurrenceId == occurrenceId)
            .ToListAsync(ct);

        return entries
            .Where(e => e.Member is not null && subtreeIds.Contains(e.Member.ParentNodeId))
            .ToList();
    }

    public async Task<List<AttendanceEntryDto>> BuildVisibleEntryDtosAsync(
        Guid churchId,
        AttendanceOccurrence occurrence,
        HashSet<Guid> visibleScopeIds,
        CancellationToken ct)
    {
        var result = new List<AttendanceEntryDto>();
        var seenMembers = new HashSet<Guid>();

        foreach (var scopeId in visibleScopeIds.OrderBy(id => id))
        {
            var subtreeIds = (await scope.CollectSubtreeNodeIdsAsync(churchId, scopeId, ct)).ToHashSet();
            foreach (var entry in occurrence.Entries)
            {
                if (entry.Member is null || !subtreeIds.Contains(entry.Member.ParentNodeId))
                    continue;

                if (!seenMembers.Add(entry.MemberId))
                    continue;

                result.Add(new AttendanceEntryDto(
                    entry.Id,
                    entry.MemberId,
                    entry.Member.Name ?? string.Empty,
                    entry.MemberScopeNodeId,
                    entry.Status.ToString()));
            }
        }

        return result;
    }

    public static AttendanceEntryStatus ParseEntryStatus(string value)
    {
        if (!Enum.TryParse<AttendanceEntryStatus>(value, ignoreCase: true, out var parsed)
            || parsed == AttendanceEntryStatus.Unrecorded)
        {
            throw new BadRequestException("Status must be Present or Absent");
        }

        return parsed;
    }

    public async Task<string?> PendingApproverRoleAsync(
        Guid churchId,
        AttendanceScopeApprovalStatus status,
        ChurchRole? enteredByRole,
        CancellationToken ct)
    {
        if (status != AttendanceScopeApprovalStatus.PendingApproval)
            return null;

        var role = await scope.ResolveApprovingRoleAsync(churchId, enteredByRole, ct);
        return role?.ToString();
    }

    public async Task<string> CellNameAsync(Guid churchId, Guid scopeNodeId, CancellationToken ct) =>
        await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && n.Id == scopeNodeId)
            .Select(n => n.Name)
            .FirstOrDefaultAsync(ct) ?? "Cell";
}
