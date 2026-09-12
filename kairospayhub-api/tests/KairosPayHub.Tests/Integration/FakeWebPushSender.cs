using KairosPayHub.Api.Domain.Notifications;
using KairosPayHub.Api.Notifications;

namespace KairosPayHub.Tests.Integration;

public sealed class FakeWebPushSender : IWebPushSender
{
    public IReadOnlyList<WebPushSendRecord> Sent => _sent;
    private readonly List<WebPushSendRecord> _sent = [];
    private readonly Dictionary<string, int> _statusByEndpoint = new();

    public void SetStatus(string endpoint, int status) => _statusByEndpoint[endpoint] = status;

    public Task<int> SendAsync(
        WebPushSubscription subscription,
        string title,
        string body,
        string? linkPath,
        CancellationToken ct = default)
    {
        _sent.Add(new WebPushSendRecord(subscription.Endpoint, title, body, linkPath));
        return Task.FromResult(_statusByEndpoint.GetValueOrDefault(subscription.Endpoint, 201));
    }

    public void Clear()
    {
        _sent.Clear();
        _statusByEndpoint.Clear();
    }
}

public sealed record WebPushSendRecord(string Endpoint, string Title, string Body, string? LinkPath);
