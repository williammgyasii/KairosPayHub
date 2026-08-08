using KairosPayHub.Api.Hubs;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.SignalR;

namespace KairosPayHub.Api.Services;

public class SignalRNotificationPublisher(IHubContext<NotificationHub, INotificationClient> hub)
    : INotificationPublisher
{
    public async Task PushAsync(
        IReadOnlyList<Guid> recipientAuthUserIds,
        IReadOnlyList<NotificationDto> notifications,
        CancellationToken ct = default)
    {
        if (notifications.Count == 0)
            return;

        for (var i = 0; i < recipientAuthUserIds.Count && i < notifications.Count; i++)
        {
            var recipientId = recipientAuthUserIds[i];
            var dto = notifications[i];
            await hub.Clients
                .Group(NotificationHub.UserGroup(recipientId))
                .NotificationReceived(dto);
        }
    }
}
