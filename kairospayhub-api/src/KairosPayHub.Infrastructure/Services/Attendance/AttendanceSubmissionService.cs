using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Mark roll-call entries and submit a scope for approval.
/// </summary>
public class AttendanceSubmissionService(
    KairosDbContext db,
    AttendanceScopeService scope,
    AttendanceRollCallExtrasService rollCallExtras,
    NotificationService notifications,
    AttendanceSubmissionSupport support,
    GuestRiskService guestRisk)
{
    public async Task PutEntriesAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        IReadOnlyList<AttendanceEntryUpdate> updates,
        IReadOnlyList<AttendanceFirstTimerInput> firstTimers,
        IReadOnlyList<AttendanceInviteeEntryInput> inviteeEntries,
        bool pastorOverride,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        var occurrence = await db.AttendanceOccurrences
            .Include(o => o.ScopeSubmissions)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var submission = occurrence.ScopeSubmissions
            .SingleOrDefault(s => s.ScopeNodeId == scopeNodeId)
            ?? throw new ForbiddenException("Scope submission not found");

        if (!await scope.CanEditScopeSubmissionAsync(actor, authUserId, occurrence, submission, pastorOverride, ct))
        {
            if (submission.LockStatus == AttendanceScopeLockStatus.NotYetOpen
                || DateTimeOffset.UtcNow < occurrence.SubmissionOpensAt)
            {
                throw new ForbiddenException("Attendance is not open yet for this occurrence");
            }

            throw new ForbiddenException("Attendance is locked for this scope");
        }

        if (updates.Count == 0 && firstTimers.Count == 0 && inviteeEntries.Count == 0)
            throw new BadRequestException("At least one roll call update is required");

        if (updates.Count > 0)
        {
            var entries = await support.EntriesInScopeAsync(churchId, occurrenceId, scopeNodeId, ct);

            var entryByMember = entries.ToDictionary(e => e.MemberId);
            var now = DateTimeOffset.UtcNow;

            foreach (var update in updates)
            {
                if (!entryByMember.TryGetValue(update.MemberId, out var entry))
                    throw new BadRequestException("Member is not in this scope");

                entry.Status = AttendanceSubmissionSupport.ParseEntryStatus(update.Status);
                entry.MarkedByAuthUserId = authUserId;
                entry.MarkedAt = now;
            }
        }

        await rollCallExtras.SaveScopeExtrasAsync(
            occurrenceId,
            scopeNodeId,
            firstTimers,
            inviteeEntries,
            ct);

        if (submission.ApprovalStatus == AttendanceScopeApprovalStatus.Rejected)
            submission.ApprovalStatus = AttendanceScopeApprovalStatus.Draft;

        await db.SaveChangesAsync(ct);
    }

    public async Task SubmitAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        bool pastorOverride = false,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        var occurrence = await db.AttendanceOccurrences
            .Include(o => o.ScopeSubmissions)
            .Include(o => o.MeetingType)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var submission = occurrence.ScopeSubmissions
            .SingleOrDefault(s => s.ScopeNodeId == scopeNodeId)
            ?? throw new ForbiddenException("Scope submission not found");

        if (!await scope.CanEditScopeSubmissionAsync(actor, authUserId, occurrence, submission, pastorOverride, ct))
        {
            if (submission.LockStatus == AttendanceScopeLockStatus.NotYetOpen
                || DateTimeOffset.UtcNow < occurrence.SubmissionOpensAt)
            {
                throw new ForbiddenException("Attendance is not open yet for this occurrence");
            }

            throw new ForbiddenException("Attendance is locked for this scope");
        }

        if (submission.ApprovalStatus == AttendanceScopeApprovalStatus.PendingApproval)
            throw new BadRequestException("Roll call is already submitted for approval");

        var entries = await support.EntriesInScopeAsync(churchId, occurrenceId, scopeNodeId, ct);

        if (entries.Count == 0)
            throw new BadRequestException("No members to submit");

        if (entries.Any(e => e.Status == AttendanceEntryStatus.Unrecorded))
            throw new BadRequestException("Mark every member present or absent before submitting");

        submission.ApprovalStatus = AttendanceScopeApprovalStatus.PendingApproval;
        submission.SubmittedAt = DateTimeOffset.UtcNow;
        submission.SubmittedByAuthUserId = authUserId;
        submission.EnteredByRole = actor.StructureRole ?? ChurchRole.CellLeader;

        await guestRisk.ApplyOnSubmitAsync(occurrenceId, scopeNodeId, ct);

        await db.SaveChangesAsync(ct);

        var cellName = await support.CellNameAsync(churchId, scopeNodeId, ct);
        await notifications.NotifyAttendancePendingAsync(
            submission,
            occurrence,
            cellName,
            ct);
    }
}
