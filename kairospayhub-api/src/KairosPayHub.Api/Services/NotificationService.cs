using KairosPayHub.Api.Data;
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

        var body = $"\"{subGiving.Title}\" needs your approval before contributions can be logged.";
        await CreateManyAsync(
            subGiving.ChurchId,
            recipients,
            NotificationKind.SubGivingPendingApproval,
            "Sub-giving awaiting approval",
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
        var body = approved
            ? $"Your sub-giving \"{subGiving.Title}\" was approved by the pastor."
            : $"Your sub-giving \"{subGiving.Title}\" was rejected"
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

    public async Task NotifyContributionPendingAsync(
        Contribution contribution,
        GivingProgram program,
        string memberName,
        CancellationToken ct = default)
    {
        var recipients = new HashSet<Guid>(await PastorAuthUserIdsAsync(program.ChurchId, ct));
        foreach (var leaderId in await FellowshipLeaderAuthUserIdsForMemberAsync(
                     program.ChurchId,
                     contribution.MemberParentNodeId,
                     ct))
        {
            recipients.Add(leaderId);
        }

        if (recipients.Count == 0)
            return;

        var body = $"{memberName} logged {contribution.Amount:N2} {contribution.Currency} on \"{program.Title}\".";
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
