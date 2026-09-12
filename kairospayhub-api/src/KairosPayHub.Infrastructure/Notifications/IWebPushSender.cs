using KairosPayHub.Api.Domain.Notifications;

namespace KairosPayHub.Api.Notifications;

public interface IWebPushSender
{
    Task<int> SendAsync(
        WebPushSubscription subscription,
        string title,
        string body,
        string? linkPath,
        CancellationToken ct = default);
}
