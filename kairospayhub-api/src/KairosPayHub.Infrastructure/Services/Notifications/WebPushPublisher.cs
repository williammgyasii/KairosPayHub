using KairosPayHub.Api.Data;
using KairosPayHub.Api.Notifications;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// OS push pipe. Recipient policy stays on the composers; this only fans stored endpoints.
/// </summary>
public class WebPushPublisher(
    KairosDbContext db,
    IWebPushSender sender,
    ILogger<WebPushPublisher> logger)
{
    public async Task PublishAsync(
        IReadOnlyList<Guid> recipientAuthUserIds,
        IReadOnlyList<NotificationDto> notifications,
        CancellationToken ct = default)
    {
        if (recipientAuthUserIds.Count == 0 || notifications.Count == 0)
            return;

        var byRecipient = new Dictionary<Guid, NotificationDto>();
        for (var i = 0; i < recipientAuthUserIds.Count && i < notifications.Count; i++)
            byRecipient[recipientAuthUserIds[i]] = notifications[i];

        var recipientIds = byRecipient.Keys.ToList();
        var subscriptions = await db.WebPushSubscriptions
            .Where(s => recipientIds.Contains(s.AuthUserId))
            .ToListAsync(ct);

        var stale = new List<Guid>();
        foreach (var subscription in subscriptions)
        {
            if (!byRecipient.TryGetValue(subscription.AuthUserId, out var dto))
                continue;

            try
            {
                var status = await sender.SendAsync(
                    subscription,
                    dto.Title,
                    dto.Body,
                    dto.LinkPath,
                    ct);
                if (status is 404 or 410)
                    stale.Add(subscription.Id);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Web Push send threw; inbox already saved");
            }
        }

        if (stale.Count == 0)
            return;

        await db.WebPushSubscriptions.Where(s => stale.Contains(s.Id)).ExecuteDeleteAsync(ct);
    }
}
