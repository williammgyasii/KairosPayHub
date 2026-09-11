using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class AttendanceApprovalService(
    KairosDbContext db,
    AttendanceScopeService scope,
    NotificationService notifications,
    AttendanceSubmissionSupport support)
{
    public async Task<IReadOnlyList<AttendanceApprovalQueueItemDto>> ListApprovalQueueAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);

        var query = db.AttendanceScopeSubmissions.AsNoTracking()
            .Include(s => s.Occurrence!)
            .ThenInclude(o => o.MeetingType)
            .Where(s => s.Occurrence!.ChurchId == churchId);

        query = await scope.ApplyAwaitingMyApprovalFilterAsync(query, churchId, actor, authUserId, ct);
        var candidates = await query
            .OrderByDescending(s => s.SubmittedAt)
            .ThenByDescending(s => s.Id)
            .ToListAsync(ct);

        if (candidates.Count == 0)
            return [];

        var scopeNodeIds = candidates.Select(s => s.ScopeNodeId).Distinct().ToList();
        var cellNames = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && scopeNodeIds.Contains(n.Id))
            .ToDictionaryAsync(n => n.Id, n => n.Name, ct);

        var submitterIds = candidates
            .Select(s => s.SubmittedByAuthUserId)
            .Where(id => id is not null)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();
        var submitterNames = submitterIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await db.ChurchMembers.AsNoTracking()
                .Where(m => m.ChurchId == churchId && m.AuthUserId != null && submitterIds.Contains(m.AuthUserId.Value))
                .ToDictionaryAsync(m => m.AuthUserId!.Value, m => m.Name ?? string.Empty, ct);

        var result = new List<AttendanceApprovalQueueItemDto>();
        foreach (var submission in candidates)
        {
            if (!await scope.CanApproveScopeSubmissionAsync(
                    actor,
                    authUserId,
                    submission,
                    submission.ScopeNodeId,
                    ct))
            {
                continue;
            }

            var counts = await support.RollCallCountsForScopeAsync(
                churchId,
                submission.OccurrenceId,
                submission.ScopeNodeId,
                ct);

            var occurrence = submission.Occurrence!;
            result.Add(new AttendanceApprovalQueueItemDto(
                submission.OccurrenceId,
                submission.ScopeNodeId,
                cellNames.GetValueOrDefault(submission.ScopeNodeId) ?? "Cell",
                occurrence.MeetingType?.Title ?? string.Empty,
                occurrence.MeetingDate,
                submission.SubmittedAt,
                submission.SubmittedByAuthUserId is Guid submitterId
                    ? submitterNames.GetValueOrDefault(submitterId)
                    : null,
                submission.EnteredByRole?.ToString(),
                counts.Present,
                counts.Absent,
                counts.Total,
                submission.GuestRiskLevel,
                GuestRiskService.ParseReasons(submission.GuestRiskReasons)));
        }

        return result;
    }

    public async Task<IReadOnlyList<AttendanceMySubmissionDto>> ListMySubmissionsAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);

        var ledNodeIds = await db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == churchId && r.AuthUserId == authUserId && r.ScopeNodeId != null)
            .Select(r => r.ScopeNodeId!.Value)
            .Distinct()
            .ToListAsync(ct);

        if (ledNodeIds.Count == 0)
            return [];

        var rows = await db.AttendanceScopeSubmissions.AsNoTracking()
            .Include(s => s.Occurrence!)
            .ThenInclude(o => o.MeetingType)
            .Where(s =>
                s.Occurrence!.ChurchId == churchId
                && ledNodeIds.Contains(s.ScopeNodeId)
                && s.ApprovalStatus != AttendanceScopeApprovalStatus.Draft)
            .OrderByDescending(s => s.SubmittedAt ?? s.Occurrence!.MeetingDate.ToDateTime(TimeOnly.MinValue))
            .ThenByDescending(s => s.Id)
            .Take(40)
            .ToListAsync(ct);

        if (rows.Count == 0)
            return [];

        var scopeIds = rows.Select(s => s.ScopeNodeId).Distinct().ToList();
        var names = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && scopeIds.Contains(n.Id))
            .ToDictionaryAsync(n => n.Id, n => n.Name, ct);

        return rows.Select(s => new AttendanceMySubmissionDto(
            s.OccurrenceId,
            s.ScopeNodeId,
            names.GetValueOrDefault(s.ScopeNodeId) ?? "Unit",
            s.Occurrence!.MeetingType?.Title ?? string.Empty,
            s.Occurrence.MeetingDate,
            s.ApprovalStatus.ToString(),
            s.SubmittedAt)).ToList();
    }

    public async Task<AttendanceApproveResult> ApproveAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        var submission = await support.LoadScopeSubmissionAsync(churchId, occurrenceId, scopeNodeId, ct);

        if (!await scope.CanApproveScopeSubmissionAsync(actor, authUserId, submission, scopeNodeId, ct))
            throw new ForbiddenException("You cannot approve this roll call");

        if (submission.ApprovalStatus != AttendanceScopeApprovalStatus.PendingApproval)
            throw new BadRequestException("Roll call is not pending approval");

        var approverRole = actor.StructureRole
            ?? throw new BadRequestException("Your account is not linked to a structure role");

        submission.EnteredByRole = approverRole;
        submission.RejectionReason = null;
        submission.RejectedByAuthUserId = null;
        submission.RejectedAt = null;
        submission.ApprovalStatus = AttendanceScopeApprovalStatus.Approved;
        submission.ApprovedByAuthUserId = authUserId;
        submission.ApprovedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);

        var cellName = await support.CellNameAsync(churchId, scopeNodeId, ct);
        var occurrence = submission.Occurrence
            ?? throw new InvalidOperationException("Occurrence not loaded");

        await notifications.NotifyAttendanceReviewedAsync(
            submission,
            occurrence,
            cellName,
            approved: true,
            ct);

        return new AttendanceApproveResult(
            Ok: true,
            IsFinal: true,
            ApprovalStatus: submission.ApprovalStatus.ToString(),
            PendingApproverRole: null);
    }

    public async Task RejectAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        string? reason,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        var submission = await support.LoadScopeSubmissionAsync(churchId, occurrenceId, scopeNodeId, ct);

        if (!await scope.CanApproveScopeSubmissionAsync(actor, authUserId, submission, scopeNodeId, ct))
            throw new ForbiddenException("You cannot reject this roll call");

        if (submission.ApprovalStatus != AttendanceScopeApprovalStatus.PendingApproval)
            throw new BadRequestException("Roll call is not pending approval");

        submission.ApprovalStatus = AttendanceScopeApprovalStatus.Rejected;
        submission.RejectedByAuthUserId = authUserId;
        submission.RejectedAt = DateTimeOffset.UtcNow;
        submission.RejectionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        submission.ApprovedByAuthUserId = null;
        submission.ApprovedAt = null;

        await db.SaveChangesAsync(ct);

        var cellName = await support.CellNameAsync(churchId, scopeNodeId, ct);
        var occurrence = submission.Occurrence
            ?? throw new InvalidOperationException("Occurrence not loaded");
        await notifications.NotifyAttendanceReviewedAsync(
            submission,
            occurrence,
            cellName,
            approved: false,
            ct);
    }
}
