using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Notifications;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class NotificationService(
    KairosDbContext db,
    GivingScopeService scope,
    INotificationPublisher publisher)
{
    public async Task<IReadOnlyList<NotificationDto>> ListAsync(
        Guid authUserId,
        Guid churchId,
        bool unreadOnly,
        int limit,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);

        var query = db.Notifications.AsNoTracking()
            .Where(n => n.RecipientAuthUserId == authUserId && n.ChurchId == churchId);

        if (unreadOnly)
            query = query.Where(n => n.ReadAt == null);

        var rows = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        return rows.Select(ToDto).ToList();
    }

    public async Task<int> GetUnreadCountAsync(
        Guid authUserId,
        Guid churchId,
        CancellationToken ct = default) =>
        await db.Notifications.CountAsync(
            n => n.RecipientAuthUserId == authUserId
                && n.ChurchId == churchId
                && n.ReadAt == null,
            ct);

    public async Task<NotificationDto?> MarkReadAsync(
        Guid authUserId,
        Guid churchId,
        Guid notificationId,
        CancellationToken ct = default)
    {
        var row = await db.Notifications.SingleOrDefaultAsync(
            n => n.Id == notificationId
                && n.RecipientAuthUserId == authUserId
                && n.ChurchId == churchId,
            ct);

        if (row is null)
            return null;

        if (row.ReadAt is null)
        {
            row.ReadAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return ToDto(row);
    }

    public async Task<int> MarkAllReadAsync(
        Guid authUserId,
        Guid churchId,
        CancellationToken ct = default)
    {
        var unread = await db.Notifications
            .Where(n => n.RecipientAuthUserId == authUserId
                && n.ChurchId == churchId
                && n.ReadAt == null)
            .ToListAsync(ct);

        if (unread.Count == 0)
            return 0;

        var now = DateTimeOffset.UtcNow;
        foreach (var row in unread)
            row.ReadAt = now;

        await db.SaveChangesAsync(ct);
        return unread.Count;
    }

    public async Task NotifySubGivingPendingAsync(
        GivingProgram subGiving,
        CancellationToken ct = default)
    {
        if (subGiving.ParentProgramId is null)
            return;

        var parentId = subGiving.ParentProgramId.Value;
        var recipients = await PastorAuthUserIdsAsync(subGiving.ChurchId, ct);
        if (recipients.Count == 0)
            return;

        var creator = await GivingProgramCreatorResolver.ResolveAsync(
            db,
            subGiving.ChurchId,
            subGiving.CreatedByAuthUserId,
            subGiving.CreatedByRole,
            ct);

        var creatorLabel = FormatCreatorLabel(creator, subGiving.CreatedByRole);
        var body = creatorLabel is not null
            ? $"{creatorLabel} submitted \"{subGiving.Title}\" for approval."
            : $"\"{subGiving.Title}\" needs your approval before contributions can be logged.";

        await CreateManyAsync(
            subGiving.ChurchId,
            recipients,
            NotificationKind.SubGivingPendingApproval,
            creatorLabel is not null
                ? $"Sub-giving from {creatorLabel.Split(" ·")[0]}"
                : "Sub-giving awaiting approval",
            body,
            LinkPath: $"givings/{parentId}?tab=subgivings",
            programId: subGiving.Id,
            relatedEntityId: subGiving.Id,
            ct);
    }

    public async Task NotifySubGivingReviewedAsync(
        GivingProgram subGiving,
        bool approved,
        CancellationToken ct = default)
    {
        if (subGiving.ParentProgramId is null)
            return;

        var parentId = subGiving.ParentProgramId.Value;
        var kind = approved
            ? NotificationKind.SubGivingApproved
            : NotificationKind.SubGivingRejected;
        var title = approved ? "Sub-giving approved" : "Sub-giving rejected";

        string? reviewerName = null;
        if (subGiving.ReviewedByAuthUserId is Guid reviewerId)
        {
            var reviewer = await GivingProgramCreatorResolver.ResolveAsync(
                db,
                subGiving.ChurchId,
                reviewerId,
                ChurchRole.Pastor,
                ct);
            reviewerName = reviewer.Name;
        }

        var body = approved
            ? $"Your sub-giving \"{subGiving.Title}\" was approved"
              + (reviewerName is not null ? $" by {reviewerName}." : " by the pastor.")
            : $"Your sub-giving \"{subGiving.Title}\" was rejected"
              + (reviewerName is not null ? $" by {reviewerName}" : " by the pastor")
              + (string.IsNullOrWhiteSpace(subGiving.RejectionReason)
                  ? "."
                  : $": {subGiving.RejectionReason}");

        await CreateManyAsync(
            subGiving.ChurchId,
            [subGiving.CreatedByAuthUserId],
            kind,
            title,
            body,
            LinkPath: $"givings/{parentId}?tab=subgivings",
            programId: subGiving.Id,
            relatedEntityId: subGiving.Id,
            ct);
    }

    public async Task NotifyGivingCampaignOpenedAsync(
        GivingProgram program,
        Guid openedByAuthUserId,
        CancellationToken ct = default)
    {
        if (program.ApprovalStatus != ProgramApprovalStatus.Approved)
            return;

        var recipients = await GivingScopeRecipientAuthUserIdsAsync(
            program,
            openedByAuthUserId,
            ct);

        if (recipients.Count == 0)
            return;

        var creator = await GivingProgramCreatorResolver.ResolveAsync(
            db,
            program.ChurchId,
            program.CreatedByAuthUserId,
            program.CreatedByRole,
            ct);

        var creatorLabel = FormatCreatorLabel(creator, program.CreatedByRole) ?? "Your pastor";
        var body =
            $"{creatorLabel} opened \"{program.Title}\" ({program.PeriodLabel}). Log contributions from Givings.";

        await CreateManyAsync(
            program.ChurchId,
            recipients,
            NotificationKind.GivingCampaignOpened,
            "New giving campaign",
            body,
            LinkPath: $"givings/{program.Id}",
            programId: program.Id,
            relatedEntityId: program.Id,
            ct);
    }

    public async Task NotifyContributionPendingAsync(
        Contribution contribution,
        GivingProgram program,
        string memberName,
        string? enteredByName,
        string? enteredByScopeUnitName,
        CancellationToken ct = default)
    {
        var recipients = await ContributionApprovalRecipientAuthUserIdsAsync(
            program.ChurchId,
            contribution.EnteredByRole,
            contribution.MemberParentNodeId,
            ct);

        if (recipients.Count == 0)
            return;

        var body = BuildContributionPendingBody(
            contribution,
            program,
            memberName,
            enteredByName,
            enteredByScopeUnitName);
        await CreateManyAsync(
            program.ChurchId,
            recipients,
            NotificationKind.ContributionPendingApproval,
            "Contribution awaiting approval",
            body,
            LinkPath: $"givings/{program.Id}?tab=pending",
            programId: program.Id,
            relatedEntityId: contribution.Id,
            ct);
    }

    private static string BuildContributionPendingBody(
        Contribution contribution,
        GivingProgram program,
        string memberName,
        string? enteredByName,
        string? enteredByScopeUnitName)
    {
        var parts = new List<string>
        {
            $"{memberName} · {contribution.Amount:N2} {contribution.Currency} on \"{program.Title}\"",
        };

        var entererParts = new List<string>();
        if (!string.IsNullOrWhiteSpace(enteredByName))
            entererParts.Add(enteredByName.Trim());
        if (contribution.EnteredByRole is not null)
            entererParts.Add(contribution.EnteredByRole.ToString()!);
        if (!string.IsNullOrWhiteSpace(enteredByScopeUnitName))
            entererParts.Add(enteredByScopeUnitName.Trim());
        if (entererParts.Count > 0)
            parts.Add($"Logged by {string.Join(" · ", entererParts)}");

        if (contribution.SentToPastor == true)
        {
            if (contribution.RemittanceMedium is not null)
            {
                var medium = contribution.RemittanceMedium == RemittanceMedium.Other
                    && !string.IsNullOrWhiteSpace(contribution.RemittanceMediumOther)
                    ? contribution.RemittanceMediumOther.Trim()
                    : contribution.RemittanceMedium.ToString();
                parts.Add($"Sent via {medium}");
            }
            else
            {
                parts.Add("Marked as sent to pastor");
            }
        }

        if (!string.IsNullOrWhiteSpace(contribution.Notes))
            parts.Add($"Notes: {contribution.Notes.Trim()}");

        parts.Add("Review payment proof on the Pending tab");
        return string.Join(". ", parts) + ".";
    }

    public async Task NotifyContributionReviewedAsync(
        Contribution contribution,
        GivingProgram program,
        string memberName,
        bool approved,
        CancellationToken ct = default)
    {
        var kind = approved
            ? NotificationKind.ContributionApproved
            : NotificationKind.ContributionRejected;
        var title = approved ? "Contribution approved" : "Contribution rejected";
        var body = approved
            ? $"Your {contribution.Amount:N2} {contribution.Currency} giving for {memberName} on \"{program.Title}\" was approved."
            : $"Your giving for {memberName} on \"{program.Title}\" was rejected"
              + (string.IsNullOrWhiteSpace(contribution.RejectedReason)
                  ? "."
                  : $": {contribution.RejectedReason}");

        await CreateManyAsync(
            program.ChurchId,
            [contribution.EnteredByAuthUserId],
            kind,
            title,
            body,
            LinkPath: $"givings/{program.Id}?tab=contributions",
            programId: program.Id,
            relatedEntityId: contribution.Id,
            ct);
    }

    public async Task NotifyAttendancePendingAsync(
        AttendanceScopeSubmission submission,
        AttendanceOccurrence occurrence,
        string cellName,
        CancellationToken ct = default)
    {
        var recipients = await AttendanceApprovalRecipientAuthUserIdsAsync(
            occurrence.ChurchId,
            submission.ScopeNodeId,
            ct);

        if (recipients.Count == 0)
            return;

        var meetingTitle = occurrence.MeetingType?.Title ?? "Service";
        var body =
            $"{cellName} · {meetingTitle} · {occurrence.MeetingDate:dddd, d MMMM yyyy}. Review the roll call on Attendance Approvals.";

        await CreateManyAsync(
            occurrence.ChurchId,
            recipients,
            NotificationKind.AttendancePendingApproval,
            "Roll call awaiting approval",
            body,
            LinkPath: "attendance/approvals",
            programId: null,
            relatedEntityId: submission.Id,
            ct);
    }

    public async Task NotifyAttendanceReviewedAsync(
        AttendanceScopeSubmission submission,
        AttendanceOccurrence occurrence,
        string cellName,
        bool approved,
        CancellationToken ct = default)
    {
        if (submission.SubmittedByAuthUserId is null)
            return;

        var meetingTitle = occurrence.MeetingType?.Title ?? "Service";
        var kind = approved
            ? NotificationKind.AttendanceApproved
            : NotificationKind.AttendanceRejected;
        var title = approved ? "Roll call approved" : "Roll call rejected";
        var body = approved
            ? $"Your roll call for {cellName} ({meetingTitle} · {occurrence.MeetingDate:dddd, d MMMM yyyy}) was approved."
            : $"Your roll call for {cellName} ({meetingTitle} · {occurrence.MeetingDate:dddd, d MMMM yyyy}) was rejected"
              + (string.IsNullOrWhiteSpace(submission.RejectionReason)
                  ? "."
                  : $": {submission.RejectionReason}");

        await CreateManyAsync(
            occurrence.ChurchId,
            [submission.SubmittedByAuthUserId.Value],
            kind,
            title,
            body,
            LinkPath: "attendance/submissions",
            programId: null,
            relatedEntityId: submission.Id,
            ct);
    }

    public async Task NotifyCalendarEventCreatedAsync(
        Guid churchId,
        Guid? scopeNodeId,
        string title,
        string? description,
        DateOnly eventDate,
        Guid createdByAuthUserId,
        Guid calendarEventId,
        CancellationToken ct = default)
    {
        var recipients = await CalendarScopeRecipientAuthUserIdsAsync(
            churchId,
            scopeNodeId,
            createdByAuthUserId,
            ct);

        if (recipients.Count == 0)
            return;

        var scopeLabel = scopeNodeId is null
            ? "Church-wide"
            : await db.StructureNodes.AsNoTracking()
                .Where(n => n.Id == scopeNodeId && n.ChurchId == churchId)
                .Select(n => n.Name)
                .FirstOrDefaultAsync(ct) ?? "Your scope";

        var body = string.IsNullOrWhiteSpace(description)
            ? $"{scopeLabel} · {eventDate:dddd, d MMMM yyyy}. Open Events to view your calendar."
            : $"{scopeLabel} · {eventDate:dddd, d MMMM yyyy}. {description.Trim()}";

        await CreateManyAsync(
            churchId,
            recipients,
            NotificationKind.CalendarEventReminder,
            title,
            body,
            LinkPath: "events",
            programId: null,
            relatedEntityId: calendarEventId,
            ct);
    }

    public async Task NotifyCalendarBirthdayReminderAsync(
        Guid churchId,
        Guid memberParentNodeId,
        string memberName,
        DateOnly birthdayDate,
        int? turningAge,
        CancellationToken ct = default)
    {
        var recipients = await CalendarScopeRecipientAuthUserIdsAsync(
            churchId,
            memberParentNodeId,
            excludeAuthUserId: null,
            ct);

        if (recipients.Count == 0)
            return;

        var cellName = await db.StructureNodes.AsNoTracking()
            .Where(n => n.Id == memberParentNodeId && n.ChurchId == churchId)
            .Select(n => n.Name)
            .FirstOrDefaultAsync(ct) ?? "Your cell";

        var ageLabel = turningAge is not null ? $"Turns {turningAge}" : "Birthday";
        var body =
            $"{memberName} · {ageLabel} · {birthdayDate:dddd, d MMMM}. Open Events to see the full calendar.";

        await CreateManyAsync(
            churchId,
            recipients,
            NotificationKind.CalendarBirthdayReminder,
            "Upcoming birthday",
            body,
            LinkPath: "events",
            programId: null,
            relatedEntityId: null,
            ct);
    }

    private async Task<List<Guid>> CalendarScopeRecipientAuthUserIdsAsync(
        Guid churchId,
        Guid? scopeNodeId,
        Guid? excludeAuthUserId,
        CancellationToken ct)
    {
        var recipients = new HashSet<Guid>();

        if (scopeNodeId is null)
        {
            recipients.UnionWith(await PastorAuthUserIdsAsync(churchId, ct));
            var leaders = await db.RoleAssignments.AsNoTracking()
                .Where(r =>
                    r.ChurchId == churchId
                    && r.Role != ChurchRole.Member
                    && r.Role != ChurchRole.Pastor)
                .Select(r => r.AuthUserId)
                .ToListAsync(ct);
            foreach (var leaderId in leaders)
                recipients.Add(leaderId);
        }
        else
        {
            var assignments = await db.RoleAssignments.AsNoTracking()
                .Where(r =>
                    r.ChurchId == churchId
                    && r.ScopeNodeId != null
                    && r.Role != ChurchRole.Member)
                .ToListAsync(ct);

            foreach (var assignment in assignments)
            {
                var viewerRoot = assignment.ScopeNodeId!.Value;
                if (viewerRoot == scopeNodeId.Value
                    || await scope.IsNodeInSubtreeAsync(churchId, viewerRoot, scopeNodeId.Value, ct)
                    || await scope.IsNodeInSubtreeAsync(churchId, scopeNodeId.Value, viewerRoot, ct))
                {
                    recipients.Add(assignment.AuthUserId);
                }
            }
        }

        if (excludeAuthUserId is Guid excluded)
            recipients.Remove(excluded);

        return recipients.ToList();
    }

    private async Task<List<Guid>> GivingScopeRecipientAuthUserIdsAsync(
        GivingProgram program,
        Guid? excludeAuthUserId,
        CancellationToken ct)
    {
        if (program.ScopeKind == ProgramScopeKind.ChurchWide)
        {
            return await CalendarScopeRecipientAuthUserIdsAsync(
                program.ChurchId,
                scopeNodeId: null,
                excludeAuthUserId,
                ct);
        }

        var scopeNodeIds = await scope.GetProgramScopeNodeIdsAsync(program, ct);
        if (scopeNodeIds.Count == 0)
            return [];

        var recipients = new HashSet<Guid>();
        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == program.ChurchId
                && r.ScopeNodeId != null
                && r.Role != ChurchRole.Member)
            .ToListAsync(ct);

        foreach (var assignment in assignments)
        {
            var viewerRoot = assignment.ScopeNodeId!.Value;
            foreach (var scopeNodeId in scopeNodeIds)
            {
                if (viewerRoot == scopeNodeId
                    || await scope.IsNodeInSubtreeAsync(program.ChurchId, viewerRoot, scopeNodeId, ct)
                    || await scope.IsNodeInSubtreeAsync(program.ChurchId, scopeNodeId, viewerRoot, ct))
                {
                    recipients.Add(assignment.AuthUserId);
                    break;
                }
            }
        }

        if (excludeAuthUserId is Guid excluded)
            recipients.Remove(excluded);

        return recipients.ToList();
    }

    private async Task CreateManyAsync(
        Guid churchId,
        IEnumerable<Guid> recipientAuthUserIds,
        NotificationKind kind,
        string title,
        string body,
        string? LinkPath,
        Guid? programId,
        Guid? relatedEntityId,
        CancellationToken ct)
    {
        var recipients = recipientAuthUserIds.Distinct().ToList();
        if (recipients.Count == 0)
            return;

        var rows = recipients.Select(recipientId => new Notification
        {
            ChurchId = churchId,
            RecipientAuthUserId = recipientId,
            Kind = kind,
            Title = title,
            Body = body,
            LinkPath = LinkPath,
            ProgramId = programId,
            RelatedEntityId = relatedEntityId,
        }).ToList();

        db.Notifications.AddRange(rows);
        await db.SaveChangesAsync(ct);

        var dtos = rows.Select(ToDto).ToList();
        await publisher.PushAsync(recipients, dtos, ct);
    }

    private async Task<List<Guid>> PastorAuthUserIdsAsync(Guid churchId, CancellationToken ct) =>
        await db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == churchId && r.Role == ChurchRole.Pastor)
            .Select(r => r.AuthUserId)
            .Distinct()
            .ToListAsync(ct);

    private async Task<List<Guid>> AttendanceApprovalRecipientAuthUserIdsAsync(
        Guid churchId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        var recipients = await FellowshipLeaderAuthUserIdsForMemberAsync(churchId, scopeNodeId, ct);

        if (await scope.ChurchHasPfccManagersAsync(churchId, ct))
        {
            recipients.AddRange(await PfccManagerAuthUserIdsForMemberAsync(churchId, scopeNodeId, ct));
        }

        return recipients.Distinct().ToList();
    }

    private async Task<List<Guid>> ContributionApprovalRecipientAuthUserIdsAsync(
        Guid churchId,
        ChurchRole? enteredByRole,
        Guid memberParentNodeId,
        CancellationToken ct)
    {
        var approvingRole = enteredByRole switch
        {
            ChurchRole.CellLeader or null => ChurchRole.FellowshipLeader,
            ChurchRole.FellowshipLeader => await scope.ChurchHasPfccManagersAsync(churchId, ct)
                ? ChurchRole.PFCCManager
                : ChurchRole.Pastor,
            ChurchRole.PFCCManager => ChurchRole.Pastor,
            _ => (ChurchRole?)null,
        };

        if (approvingRole is null)
            return [];

        if (approvingRole == ChurchRole.Pastor)
            return await PastorAuthUserIdsAsync(churchId, ct);

        if (approvingRole == ChurchRole.PFCCManager)
            return await PfccManagerAuthUserIdsForMemberAsync(churchId, memberParentNodeId, ct);

        return await FellowshipLeaderAuthUserIdsForMemberAsync(churchId, memberParentNodeId, ct);
    }

    private async Task<List<Guid>> PfccManagerAuthUserIdsForMemberAsync(
        Guid churchId,
        Guid memberParentNodeId,
        CancellationToken ct)
    {
        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == churchId
                && r.Role == ChurchRole.PFCCManager
                && r.ScopeNodeId != null)
            .ToListAsync(ct);

        var result = new List<Guid>();
        foreach (var assignment in assignments)
        {
            var subtree = await scope.CollectSubtreeNodeIdsAsync(
                churchId,
                assignment.ScopeNodeId!.Value,
                ct);
            if (subtree.Contains(memberParentNodeId))
                result.Add(assignment.AuthUserId);
        }

        return result.Distinct().ToList();
    }

    private async Task<List<Guid>> FellowshipLeaderAuthUserIdsForMemberAsync(
        Guid churchId,
        Guid memberParentNodeId,
        CancellationToken ct)
    {
        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == churchId
                && r.Role == ChurchRole.FellowshipLeader
                && r.ScopeNodeId != null)
            .ToListAsync(ct);

        var result = new List<Guid>();
        foreach (var assignment in assignments)
        {
            var subtree = await scope.CollectSubtreeNodeIdsAsync(
                churchId,
                assignment.ScopeNodeId!.Value,
                ct);
            if (subtree.Contains(memberParentNodeId))
                result.Add(assignment.AuthUserId);
        }

        return result.Distinct().ToList();
    }

    private static string? FormatCreatorLabel(ProgramCreatorDisplay creator, ChurchRole? role)
    {
        if (string.IsNullOrWhiteSpace(creator.Name))
            return null;

        var parts = new List<string> { creator.Name.Trim() };
        if (role is not null && role != ChurchRole.Pastor)
            parts.Add(FormatRole(role.Value));
        if (!string.IsNullOrWhiteSpace(creator.ScopeUnitName))
            parts.Add(creator.ScopeUnitName.Trim());
        return string.Join(" · ", parts);
    }

    private static string FormatRole(ChurchRole role) =>
        role switch
        {
            ChurchRole.PFCCManager => "PFCC Manager",
            ChurchRole.FellowshipLeader => "Fellowship Leader",
            ChurchRole.CellLeader => "Cell Leader",
            ChurchRole.Pastor => "Pastor",
            _ => role.ToString(),
        };

    private static NotificationDto ToDto(Notification row) =>
        new(
            row.Id,
            row.Kind.ToString(),
            row.Title,
            row.Body,
            row.LinkPath,
            row.ProgramId,
            row.CreatedAt,
            row.ReadAt);
}

public interface INotificationPublisher
{
    Task PushAsync(
        IReadOnlyList<Guid> recipientAuthUserIds,
        IReadOnlyList<NotificationDto> notifications,
        CancellationToken ct = default);
}
