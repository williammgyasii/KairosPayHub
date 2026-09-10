using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Notifications;
using KairosPayHub.Api.Web;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Delivery only: persist in-app rows and push realtime. No recipient policy or copy.
/// </summary>
public class NotificationEngine(KairosDbContext db, INotificationPublisher publisher)
{
    public async Task DeliverAsync(
        Guid churchId,
        IEnumerable<Guid> recipientAuthUserIds,
        NotificationKind kind,
        string title,
        string body,
        string? LinkPath,
        Guid? programId,
        Guid? relatedEntityId,
        CancellationToken ct = default)
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

    public static NotificationDto ToDto(Notification row) =>
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
