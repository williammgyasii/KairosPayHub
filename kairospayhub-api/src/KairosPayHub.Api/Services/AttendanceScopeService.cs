using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class AttendanceScopeService(KairosDbContext db, GivingScopeService givingScope)
{
    public bool IsPastor(Actor actor) => givingScope.IsPastor(actor);

    public Task<List<Guid>> CollectSubtreeNodeIdsAsync(
        Guid churchId,
        Guid rootId,
        CancellationToken ct = default) =>
        givingScope.CollectSubtreeNodeIdsAsync(churchId, rootId, ct);

    public Task<bool> IsNodeInSubtreeAsync(
        Guid churchId,
        Guid ancestorNodeId,
        Guid nodeId,
        CancellationToken ct = default) =>
        givingScope.IsNodeInSubtreeAsync(churchId, ancestorNodeId, nodeId, ct);

    public Task<ChurchRole?> ResolveApprovingRoleAsync(
        Guid churchId,
        ChurchRole? enteredByRole,
        CancellationToken ct = default) =>
        ResolveAttendancePendingApproverRoleAsync(churchId, enteredByRole, ct);

    /// <summary>
    /// Label hint for pending approval UI. One-hop parent leaders approve.
    /// </summary>
    public Task<ChurchRole?> ResolveAttendancePendingApproverRoleAsync(
        Guid churchId,
        ChurchRole? enteredByRole,
        CancellationToken ct = default)
    {
        _ = churchId;
        _ = ct;
        return Task.FromResult<ChurchRole?>(enteredByRole switch
        {
            null or ChurchRole.CellLeader => ChurchRole.FellowshipLeader,
            ChurchRole.FellowshipLeader => ChurchRole.PFCCManager,
            _ => null,
        });
    }

    public Task<bool> ChurchHasPfccManagersAsync(Guid churchId, CancellationToken ct = default) =>
        givingScope.ChurchHasPfccManagersAsync(churchId, ct);

    public bool CanManageChurch(Actor actor) => givingScope.CanManageChurch(actor);

    public async Task<bool> CanApproveScopeSubmissionAsync(
        Actor actor,
        Guid authUserId,
        AttendanceScopeSubmission submission,
        Guid scopeNodeId,
        CancellationToken ct = default)
    {
        if (submission.ApprovalStatus != AttendanceScopeApprovalStatus.PendingApproval)
            return false;

        var parentNodeId = await db.StructureNodes.AsNoTracking()
            .Where(n => n.Id == scopeNodeId && n.ChurchId == actor.StructureChurchId)
            .Select(n => n.ParentNodeId)
            .FirstOrDefaultAsync(ct);

        if (parentNodeId is not Guid parentId)
            return false;

        return await db.RoleAssignments.AsNoTracking()
            .AnyAsync(
                r => r.ChurchId == actor.StructureChurchId
                    && r.AuthUserId == authUserId
                    && r.ScopeNodeId == parentId,
                ct);
    }

    public Task<bool> IncludeSubmissionInOverviewRollupAsync(
        Actor actor,
        AttendanceScopeSubmission submission,
        CancellationToken ct = default) =>
        Task.FromResult(submission.ApprovalStatus == AttendanceScopeApprovalStatus.Approved);

    public async Task<bool> CanEditScopeSubmissionAsync(
        Actor actor,
        Guid authUserId,
        AttendanceOccurrence occurrence,
        AttendanceScopeSubmission submission,
        bool pastorOverride,
        CancellationToken ct = default)
    {
        if (occurrence.Status == AttendanceOccurrenceStatus.Excused)
            return false;

        if (pastorOverride && CanManageChurch(actor))
            return true;

        if (!await CanLeadScopeSubmissionAsync(actor, authUserId, submission, ct))
            return false;

        if (submission.ApprovalStatus is not (
            AttendanceScopeApprovalStatus.Draft
            or AttendanceScopeApprovalStatus.Rejected))
        {
            return false;
        }

        var isAlwaysOpen = occurrence.MeetingType?.IsAlwaysOpen
            ?? await db.AttendanceMeetingTypes.AsNoTracking()
                .Where(t => t.Id == occurrence.MeetingTypeId)
                .Select(t => t.IsAlwaysOpen)
                .FirstOrDefaultAsync(ct);

        var now = DateTimeOffset.UtcNow;
        return submission.LockStatus switch
        {
            AttendanceScopeLockStatus.Editable =>
                isAlwaysOpen
                || (now >= occurrence.SubmissionOpensAt && now < occurrence.SubmissionDeadlineAt),
            AttendanceScopeLockStatus.Reopened =>
                submission.GraceDeadlineAt is not null && now < submission.GraceDeadlineAt.Value,
            _ => false,
        };
    }

    public async Task<IQueryable<AttendanceScopeSubmission>> ApplyAwaitingMyApprovalFilterAsync(
        IQueryable<AttendanceScopeSubmission> query,
        Guid churchId,
        Actor actor,
        Guid authUserId,
        CancellationToken ct = default)
    {
        await Task.CompletedTask;
        query = query.Where(s => s.ApprovalStatus == AttendanceScopeApprovalStatus.PendingApproval);

        var myLedNodeIds = db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == churchId && r.AuthUserId == authUserId && r.ScopeNodeId != null)
            .Select(r => r.ScopeNodeId!.Value);

        return query.Where(s =>
            db.StructureNodes.Any(n =>
                n.Id == s.ScopeNodeId
                && n.ParentNodeId != null
                && myLedNodeIds.Contains(n.ParentNodeId.Value)));
    }

    public async Task<bool> CanLeadScopeSubmissionAsync(
        Actor actor,
        Guid authUserId,
        AttendanceScopeSubmission submission,
        CancellationToken ct = default)
    {
        if (submission.AssignedLeaderAuthUserId == authUserId)
            return true;

        // Exact unit only — parent leaders approve; they do not edit child sheets.
        return await db.RoleAssignments.AsNoTracking()
            .AnyAsync(
                r => r.ChurchId == actor.StructureChurchId
                    && r.AuthUserId == authUserId
                    && r.ScopeNodeId == submission.ScopeNodeId,
                ct);
    }
}
