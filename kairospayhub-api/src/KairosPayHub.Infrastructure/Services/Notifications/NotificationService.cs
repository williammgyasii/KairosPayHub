using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Notifications;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Composers: build kind/title/body/link, resolve recipients via managers, deliver via engine.
/// </summary>
public class NotificationService(
    KairosDbContext db,
    GivingScopeService scope,
    NotificationEngine engine,
    NotificationRecipientResolver recipientResolver)
{
    public async Task NotifySubGivingPendingAsync(
        GivingProgram subGiving,
        CancellationToken ct = default)
    {
        if (subGiving.ParentProgramId is null)
            return;

        var parentId = subGiving.ParentProgramId.Value;
        var recipientIds = await recipientResolver.PastorAuthUserIdsAsync(subGiving.ChurchId, ct);
        if (recipientIds.Count == 0)
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

        await engine.DeliverAsync(
            subGiving.ChurchId,
            recipientIds,
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

        await engine.DeliverAsync(
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

        await engine.DeliverAsync(
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
        var recipientIds = await recipientResolver.ForContributionApprovalAsync(
            program.ChurchId,
            contribution.EnteredByRole,
            contribution.MemberParentNodeId,
            ct);

        if (recipientIds.Count == 0)
            return;

        var body = BuildContributionPendingBody(
            contribution,
            program,
            memberName,
            enteredByName,
            enteredByScopeUnitName);
        await engine.DeliverAsync(
            program.ChurchId,
            recipientIds,
            NotificationKind.ContributionPendingApproval,
            "Contribution awaiting approval",
            body,
            LinkPath: $"givings/{program.Id}?tab=awaiting",
            programId: program.Id,
            relatedEntityId: contribution.Id,
            ct);
    }

    public async Task NotifyContributionBatchPendingAsync(
        Guid batchId,
        IReadOnlyList<Contribution> contributions,
        GivingProgram program,
        string? enteredByName,
        string? enteredByScopeUnitName,
        CancellationToken ct = default)
    {
        if (contributions.Count == 0)
            return;

        var first = contributions[0];
        var recipientIds = await recipientResolver.ForContributionApprovalAsync(
            program.ChurchId,
            first.EnteredByRole,
            first.MemberParentNodeId,
            ct);

        if (recipientIds.Count == 0)
            return;

        var totalAmount = contributions.Sum(c => c.Amount);
        var currency = first.Currency;
        var body = BuildContributionBatchPendingBody(
            contributions.Count,
            totalAmount,
            currency,
            program,
            enteredByName,
            enteredByScopeUnitName,
            first);

        await engine.DeliverAsync(
            program.ChurchId,
            recipientIds,
            NotificationKind.ContributionPendingApproval,
            "Batch awaiting approval",
            body,
            LinkPath: $"givings/{program.Id}?tab=awaiting",
            programId: program.Id,
            relatedEntityId: batchId,
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

        AppendEntererAndRemittance(parts, contribution, enteredByName, enteredByScopeUnitName);

        if (!string.IsNullOrWhiteSpace(contribution.Notes))
            parts.Add($"Notes: {contribution.Notes.Trim()}");

        parts.Add("Review payment proof on the Awaiting approval tab");
        return string.Join(". ", parts) + ".";
    }

    private static string BuildContributionBatchPendingBody(
        int memberCount,
        decimal totalAmount,
        string currency,
        GivingProgram program,
        string? enteredByName,
        string? enteredByScopeUnitName,
        Contribution sample)
    {
        var parts = new List<string>
        {
            $"Batch of {memberCount} contributions · {totalAmount:N2} {currency} total on \"{program.Title}\"",
        };

        AppendEntererAndRemittance(parts, sample, enteredByName, enteredByScopeUnitName);

        if (!string.IsNullOrWhiteSpace(sample.Notes))
            parts.Add($"Notes: {sample.Notes.Trim()}");

        parts.Add("Review the batch on the Awaiting approval tab");
        return string.Join(". ", parts) + ".";
    }

    private static void AppendEntererAndRemittance(
        List<string> parts,
        Contribution contribution,
        string? enteredByName,
        string? enteredByScopeUnitName)
    {
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

        await engine.DeliverAsync(
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
        var recipientIds = await recipientResolver.ForAttendanceApprovalAsync(
            occurrence.ChurchId,
            submission.EnteredByRole,
            submission.ScopeNodeId,
            ct);

        if (recipientIds.Count == 0)
            return;

        var meetingTitle = occurrence.MeetingType?.Title ?? "Service";
        string? submitterName = null;
        if (submission.SubmittedByAuthUserId is Guid submitterId)
        {
            var submitter = await GivingProgramCreatorResolver.ResolveAsync(
                db,
                occurrence.ChurchId,
                submitterId,
                submission.EnteredByRole,
                ct);
            submitterName = submitter.Name;
        }

        var roleLabel = submission.EnteredByRole is { } role && role != ChurchRole.Pastor
            ? FormatRole(role)
            : null;
        var (title, body) = AttendanceSubmitNotificationCopy.Pending(
            submitterName,
            roleLabel,
            cellName,
            meetingTitle,
            hasReport: !string.IsNullOrWhiteSpace(submission.ReportPayload));

        await engine.DeliverAsync(
            occurrence.ChurchId,
            recipientIds,
            NotificationKind.AttendancePendingApproval,
            title,
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

        await engine.DeliverAsync(
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
        ChurchRole? createdByRole,
        Guid calendarEventId,
        bool notifyLeadersUp,
        bool notifyLeadersDown,
        CancellationToken ct = default)
    {
        if (!notifyLeadersUp && !notifyLeadersDown)
            return;

        var recipients = await CalendarEventAlertRecipientAuthUserIdsAsync(
            churchId,
            scopeNodeId,
            createdByAuthUserId,
            notifyLeadersUp,
            notifyLeadersDown,
            ct);

        if (recipients.Count == 0)
            return;

        var scopeLabel = scopeNodeId is null
            ? "Church-wide"
            : await db.StructureNodes.AsNoTracking()
                .Where(n => n.Id == scopeNodeId && n.ChurchId == churchId)
                .Select(n => n.Name)
                .FirstOrDefaultAsync(ct) ?? "Your scope";

        var creator = await GivingProgramCreatorResolver.ResolveAsync(
            db,
            churchId,
            createdByAuthUserId,
            createdByRole,
            ct);

        var creatorLabel = FormatCreatorLabel(creator, createdByRole);
        var notificationTitle = BuildCalendarEventNotificationTitle(createdByRole, scopeLabel);
        var body = BuildCalendarEventNotificationBody(
            creatorLabel,
            createdByRole,
            scopeLabel,
            title,
            eventDate,
            description);

        await engine.DeliverAsync(
            churchId,
            recipients,
            NotificationKind.CalendarEventReminder,
            notificationTitle,
            body,
            LinkPath: "events",
            programId: null,
            relatedEntityId: calendarEventId,
            ct);
    }

    private static string BuildCalendarEventNotificationTitle(ChurchRole? role, string scopeLabel)
    {
        var eventType = role switch
        {
            ChurchRole.CellLeader => "cell event",
            ChurchRole.FellowshipLeader => "fellowship event",
            ChurchRole.PFCCManager => "PFCC event",
            ChurchRole.Pastor or ChurchRole.ChurchAdmin => "church event",
            _ => "calendar event",
        };

        return scopeLabel is "Church-wide"
            ? $"New {eventType}"
            : $"New {eventType} · {scopeLabel}";
    }

    private static string BuildCalendarEventNotificationBody(
        string? creatorLabel,
        ChurchRole? role,
        string scopeLabel,
        string eventTitle,
        DateOnly eventDate,
        string? description)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(creatorLabel))
        {
            parts.Add($"{creatorLabel} created a new event.");
        }
        else
        {
            var sourceParts = new List<string>();
            if (scopeLabel is not "Church-wide")
                sourceParts.Add(scopeLabel);
            if (role is ChurchRole sourceRole && sourceRole is not (ChurchRole.Pastor or ChurchRole.ChurchAdmin))
                sourceParts.Add(FormatRole(sourceRole));

            parts.Add(sourceParts.Count > 0
                ? $"{string.Join(" · ", sourceParts)} created a new event."
                : "A new church-wide event was created.");
        }

        parts.Add($"\"{eventTitle.Trim()}\" · {eventDate:dddd, d MMMM yyyy}.");

        if (!string.IsNullOrWhiteSpace(description))
            parts.Add(description.Trim());

        return string.Join(" ", parts);
    }

    private async Task<List<Guid>> CalendarEventAlertRecipientAuthUserIdsAsync(
        Guid churchId,
        Guid? scopeNodeId,
        Guid? excludeAuthUserId,
        bool notifyUp,
        bool notifyDown,
        CancellationToken ct)
    {
        var recipients = new HashSet<Guid>();

        if (notifyUp)
            recipients.UnionWith(await recipientResolver.PastorAuthUserIdsAsync(churchId, ct));

        if (scopeNodeId is null)
        {
            if (notifyDown)
            {
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
                if (viewerRoot == scopeNodeId.Value)
                    continue;

                if (notifyUp
                    && await scope.IsNodeInSubtreeAsync(churchId, viewerRoot, scopeNodeId.Value, ct))
                {
                    recipients.Add(assignment.AuthUserId);
                }

                if (notifyDown
                    && await scope.IsNodeInSubtreeAsync(churchId, scopeNodeId.Value, viewerRoot, ct))
                {
                    recipients.Add(assignment.AuthUserId);
                }
            }
        }

        if (excludeAuthUserId is Guid excluded)
            recipients.Remove(excluded);

        return recipients.ToList();
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

        await engine.DeliverAsync(
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
            recipients.UnionWith(await recipientResolver.PastorAuthUserIdsAsync(churchId, ct));
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

}
