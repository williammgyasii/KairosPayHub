namespace KairosPayHub.Api.Notifications;

public class WebPushOptions
{
    public const string SectionName = "WebPush";

    public string PublicKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
    public string Subject { get; set; } = "mailto:noreply@localhost";
}
