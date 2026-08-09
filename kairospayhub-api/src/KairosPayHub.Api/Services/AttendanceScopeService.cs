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
        givingScope.ResolveContributionApprovingRoleAsync(churchId, enteredByRole, ct);

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

        var approvingRole = await ResolveApprovingRoleAsync(
            actor.StructureChurchId,
            submission.EnteredByRole,
            ct);
        if (approvingRole is null)
            return false;

        if (CanManageChurch(actor))
            return approvingRole == ChurchRole.Pastor;

        return approvingRole switch
        {
            ChurchRole.FellowshipLeader => await MemberWithinRoleAssignmentsAsync(
                actor.StructureChurchId,
                authUserId,
                ChurchRole.FellowshipLeader,
                scopeNodeId,
                ct),
            ChurchRole.PFCCManager => await MemberWithinRoleAssignmentsAsync(
                actor.StructureChurchId,
                authUserId,
                ChurchRole.PFCCManager,
                scopeNodeId,
                ct),
            _ => false,
        };
    }

    public async Task<bool> IncludeSubmissionInOverviewRollupAsync(
        Actor actor,
        AttendanceScopeSubmission submission,
        CancellationToken ct = default)
    {
        if (submission.ApprovalStatus == AttendanceScopeApprovalStatus.Approved)
            return true;

        if (submission.ApprovalStatus != AttendanceScopeApprovalStatus.PendingApproval)
            return false;

        if (CanManageChurch(actor))
            return false;

        var hasPfcc = await ChurchHasPfccManagersAsync(actor.StructureChurchId, ct);
        return actor.StructureRole switch
        {
            ChurchRole.FellowshipLeader =>
                submission.EnteredByRole is ChurchRole.FellowshipLeader or ChurchRole.PFCCManager,
            ChurchRole.PFCCManager when hasPfcc =>
                submission.EnteredByRole == ChurchRole.PFCCManager,
            _ => false,
        };
    }

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

        // Testing: keep draft/rejected roll calls editable regardless of window/lock status.
        if (submission.ApprovalStatus is AttendanceScopeApprovalStatus.Draft
            or AttendanceScopeApprovalStatus.Rejected)
        {
            return true;
        }

        var now = DateTimeOffset.UtcNow;
        return submission.LockStatus switch
        {
            AttendanceScopeLockStatus.Editable =>
                now >= occurrence.SubmissionOpensAt && now < occurrence.SubmissionDeadlineAt,
            AttendanceScopeLockStatus.Reopened =>
                submission.GraceDeadlineAt is not null && now < submission.GraceDeadlineAt.Value,
            _ => false,
        };
    }

    public async Task<IQueryable<AttendanceScopeSubmission>> ApplyAwaitingMyApprovalFilterAsync(
        IQueryable<AttendanceScopeSubmission> query,
        Guid churchId,
        Actor actor,
        CancellationToken ct = default)
    {
        if (actor.StructureRole is not ChurchRole role)
            return query.Where(_ => false);

        query = query.Where(s => s.ApprovalStatus == AttendanceScopeApprovalStatus.PendingApproval);
        var hasPfcc = await ChurchHasPfccManagersAsync(churchId, ct);

        return role switch
        {
            ChurchRole.FellowshipLeader => query.Where(s => s.EnteredByRole == ChurchRole.CellLeader),
            ChurchRole.PFCCManager when hasPfcc => query.Where(s => s.EnteredByRole == ChurchRole.FellowshipLeader),
            ChurchRole.Pastor => query.Where(s =>
                s.EnteredByRole == ChurchRole.PFCCManager
                || (s.EnteredByRole == ChurchRole.FellowshipLeader && !hasPfcc)),
            _ => query.Where(_ => false),
        };
    }

    public async Task<bool> CanLeadScopeSubmissionAsync(
        Actor actor,
        Guid authUserId,
        AttendanceScopeSubmission submission,
        CancellationToken ct = default)
    {
        if (submission.AssignedLeaderAuthUserId == authUserId)
            return true;

        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == actor.StructureChurchId
                && r.AuthUserId == authUserId
                && r.Role == ChurchRole.CellLeader
                && r.ScopeNodeId != null)
            .Select(r => r.ScopeNodeId!.Value)
            .ToListAsync(ct);

        foreach (var scopeNodeId in assignments)
        {
            if (scopeNodeId == submission.ScopeNodeId)
                return true;

            if (await givingScope.IsNodeInSubtreeAsync(
                    actor.StructureChurchId,
                    scopeNodeId,
                    submission.ScopeNodeId,
                    ct))
            {
                return true;
            }
        }

        return false;
    }

    private async Task<bool> MemberWithinRoleAssignmentsAsync(
        Guid churchId,
        Guid authUserId,
        ChurchRole role,
        Guid memberParentNodeId,
        CancellationToken ct)
    {
        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == churchId && r.AuthUserId == authUserId && r.Role == role)
            .Select(r => r.ScopeNodeId)
            .ToListAsync(ct);

        foreach (var scopeNodeId in assignments.Where(id => id is not null))
        {
            if (await givingScope.IsNodeInSubtreeAsync(
                    churchId,
                    scopeNodeId!.Value,
                    memberParentNodeId,
                    ct))
            {
                return true;
            }
        }

        return false;
    }
}
