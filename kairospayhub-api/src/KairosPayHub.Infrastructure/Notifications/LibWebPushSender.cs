using System.Net;
using System.Text.Json;
using KairosPayHub.Api.Domain.Notifications;
using Microsoft.Extensions.Options;
using WebPush;

namespace KairosPayHub.Api.Notifications;

public class LibWebPushSender(IOptions<WebPushOptions> options, ILogger<LibWebPushSender> logger)
    : IWebPushSender
{
    public async Task<int> SendAsync(
        WebPushSubscription subscription,
        string title,
        string body,
        string? linkPath,
        CancellationToken ct = default)
    {
        var cfg = options.Value;
        if (string.IsNullOrWhiteSpace(cfg.PublicKey) || string.IsNullOrWhiteSpace(cfg.PrivateKey))
        {
            logger.LogWarning("Web Push skipped: VAPID keys are not configured");
            return 200;
        }

        var payload = JsonSerializer.Serialize(new { title, body, linkPath });
        var client = new WebPushClient();
        try
        {
            await client.SendNotificationAsync(
                new PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth),
                payload,
                new VapidDetails(cfg.Subject, cfg.PublicKey, cfg.PrivateKey),
                ct);
            return 201;
        }
        catch (WebPushException ex)
        {
            var status = (int)(ex.StatusCode == default ? HttpStatusCode.BadGateway : ex.StatusCode);
            logger.LogWarning(ex, "Web Push send failed with status {Status}", status);
            return status;
        }
    }
}
