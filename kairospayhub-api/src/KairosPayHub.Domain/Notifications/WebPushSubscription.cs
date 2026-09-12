namespace KairosPayHub.Api.Domain.Notifications;

public class WebPushSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuthUserId { get; set; }
    public Guid ChurchId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;
}
